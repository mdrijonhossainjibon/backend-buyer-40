import { Router, Request, Response } from 'express';
import SpinWheelConfig from 'models/SpinWheelConfig';
import SpinTicket from 'models/SpinTicket';
import SpinHistory from 'models/SpinHistory';
import User from 'models/User';
 
import { Wallet } from 'models';
import { io } from '../../server';
import { verifySignature } from 'lib/auth';

const router = Router();

// GET /api/v1/spin-wheel/config - Get spin wheel configuration
router.get('/spin-wheel/config', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.query;
    
    const { success: sigSuccess, data: sigData } = verifySignature(
      { signature, timestamp, hash } as any,
      process.env.SPIN_WHEEL_SECRET_KEY || 'app'
    );
 

    if (!sigSuccess) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or expired timestamp'
      });
    }

    const { telegramId } = JSON.parse(sigData as string);

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findOne({ userId : telegramId});
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let config = await SpinWheelConfig.findOne({}).sort({ createdAt: -1 });

    // If no config exists, create default configuration
    if (!config) {
      config = await SpinWheelConfig.create({
        enabled: true,
        segments: [
          {
            id: '1',
            label: '50 XP',
            value: 50,
            color: '#F0B90B',
            probability: 15
          },
          {
            id: '2',
            label: '100 XP',
            value: 100,
            color: '#FCD535',
            probability: 10
          },
          {
            id: '3',
            label: '200 XP',
            value: 200,
            color: '#FF6B35',
            probability: 5
          },
          {
            id: '4',
            label: '500 XP',
            value: 500,
            color: '#0ECB81',
            probability: 2
          },
          {
            id: '5',
            label: 'Thanks',
            value: 0,
            color: '#2B3139',
            probability: 25
          },
          {
            id: '6',
            label: 'Thanks',
            value: 0,
            color: '#1E2329',
            probability: 23
          },
          {
            id: '7',
            label: 'Thanks',
            value: 0,
            color: '#474D57',
            probability: 20
          }
        ],
        maxSpinsPerDay: 4,
        maxFreeSpins: 4,
        maxExtraSpins: 6,
        spinCooldownMinutes: 60,
        ticketPrice: 100,
        minBalanceRequired: 0
      });
    }
    console.log(config.maxExtraSpins)

    // Get or create spin ticket
    let spinTicket = await SpinTicket.findOne({ userId : telegramId });
    if (!spinTicket) {
      spinTicket = await SpinTicket.create({ userId : telegramId });
    }

    // Check if we need to reset daily spins
    const now = new Date();
    const lastReset = spinTicket.lastResetDate || new Date(0);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      spinTicket.freeSpinsUsed = 0;
      spinTicket.extraSpinsUnlocked = config.maxExtraSpins;
      spinTicket.extraSpinsUsed = 0;
      spinTicket.lastResetDate = now;
      await spinTicket.save();
    }

    // Calculate spin availability
    const freeSpinsUsed = spinTicket.freeSpinsUsed || 0;
    const extraSpinsUnlocked = spinTicket.extraSpinsUnlocked || 0;
    const extraSpinsUsed = spinTicket.extraSpinsUsed || 0;
    const maxFreeSpins = config.maxFreeSpins || 4;
    const maxExtraSpins = config.maxExtraSpins || 6;
    
    // Calculate remaining extra spins
    const extraSpinsRemaining = Math.max(0, extraSpinsUnlocked - extraSpinsUsed);
    
    const canSpin = (freeSpinsUsed < maxFreeSpins) || (extraSpinsRemaining > 0);
    const nextSpinTime = canSpin ? null : (lastReset.getTime() + 24 * 60 * 60 * 1000);

    return res.json({
      success: true,
      data: {
        prizes: config.segments.map((seg :any) => ({
          id: seg.id,
          label: seg.label,
          amount: seg.value,
          color: seg.color,
          probability: seg.probability
        })),
        canSpin,
        nextSpinTime,
        spinsToday: freeSpinsUsed + Math.max(0, (maxFreeSpins - freeSpinsUsed - extraSpinsUnlocked)),
        maxSpinsPerDay: maxFreeSpins + maxExtraSpins,
        freeSpinsUsed,
        maxFreeSpins,
        extraSpinsUnlocked,
        extraSpinsUsed: spinTicket.extraSpinsUsed || 0,
        maxExtraSpins,
        spinTickets: spinTicket.ticketCount || 0,
        ticketPrice: config.ticketPrice || 100
      }
    });

  } catch (error : any) {
    console.error('Spin Wheel Config GET error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// POST /api/v1/spin-wheel/purchase-ticket - Purchase spin tickets
router.post('/spin-wheel/purchase-ticket', async (req: Request, res: Response) => {
 
  try {
    
  const {  signature , timestamp ,  hash } = req.body;
    
  const { success , data  } = verifySignature({ signature , timestamp , hash} , process.env.SPIN_WHEEL_SECRET_KEY || 'app');

  if (!success) {
    return res.status(401).json({
      success: false,
      message: 'Invalid signature or expired timestamp'
    });
  }

  const { telegramId , quantity = 1  } = JSON.parse(data as string);
  

    // Validate input
    if (!telegramId) {
      return res.status(400).json({  success: false,  message: 'User ID is required' });
    }

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: 'Ticket count must be between 1 and 100'
      });
    }

    // Find user
    const user = await User.findOne({ userId : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }
    const config = await SpinWheelConfig.findOne();

    if(!config){
     return res.status(400).json({
        success: false,
        message: `plase config fast`
      });
    }
    // Calculate total cost
    const totalCost = quantity * config.ticketPrice;

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId : telegramId});
    if (!wallet) {
      wallet = await Wallet.create({
        userId : telegramId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 }
      });
    }

    // Check if user has enough balance
    if (wallet.balances.xp < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You need ${totalCost} XP but have ${wallet.balances.xp} XP`,
        required: totalCost,
        available: wallet.balances.xp
      });
    }

    // Deduct balance from wallet
    wallet.balances.xp -= totalCost;
    wallet.totalSpent.xp += totalCost;
    wallet.lastTransaction = new Date();
    wallet.balances.spin = quantity;
    await wallet.save();

    // Update or create spin ticket record
    let spinTicket = await SpinTicket.findOne({ userId : telegramId });
    if (!spinTicket) {
      spinTicket = await SpinTicket.create({
        userId : telegramId,
        ticketCount : quantity,
        totalPurchased: quantity,
        lastPurchaseDate: new Date()
      });
    } else {
      spinTicket.ticketCount +=  quantity;
      spinTicket.totalPurchased += quantity;
      spinTicket.lastPurchaseDate = new Date();
      await spinTicket.save();
    }

    return res.json({
      success: true,
      message: `Successfully purchased ${quantity} ticket(s)`,
      data: {
        ticketsPurchased: quantity,
        totalCost,
        remainingBalance: wallet.balances.xp,
        totalTickets: spinTicket.ticketCount
      }
    });

  } catch (error) {
    console.error('Purchase Ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/spin-wheel/spin - Execute a free spin
router.post('/spin-wheel/spin', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.body;
    
    const { success: sigSuccess, data: sigData } = verifySignature(
      { signature, timestamp, hash },
      process.env.SPIN_WHEEL_SECRET_KEY || 'app'
    );

    if (!sigSuccess) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or expired timestamp'
      });
    }

    const {  telegramId } = JSON.parse(sigData as string);

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findOne({ userId  : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    // Get spin wheel config
    const config = await SpinWheelConfig.findOne({}).sort({ createdAt: -1 });
    if (!config || !config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Spin wheel is currently disabled'
      });
    }

    // Get spin ticket
    let spinTicket = await SpinTicket.findOne({ userId : telegramId });
    if (!spinTicket) {
      spinTicket = await SpinTicket.create({
        userId : telegramId,
        ticketCount: 0,
        totalPurchased: 0,
        totalSpins: 0,
        totalWinnings: 0,
        freeSpinsUsed: 0,
        extraSpinsUnlocked: 0,
        extraSpinsUsed: 0,
        lastResetDate: new Date()
      });
    }

    const maxFreeSpins = config.maxFreeSpins || 4;
    const freeSpinsUsed = spinTicket.freeSpinsUsed || 0;
    const extraSpinsUnlocked = spinTicket.extraSpinsUnlocked || 0;
    const extraSpinsUsed = spinTicket.extraSpinsUsed || 0;
    const extraSpinsRemaining = Math.max(0, extraSpinsUnlocked - extraSpinsUsed);

    // Check if user can spin
    const canUseFree = freeSpinsUsed < maxFreeSpins;
    const canUseExtra = extraSpinsRemaining > 0;

    if (!canUseFree && !canUseExtra) {
      return res.status(400).json({
        success: false,
        message: 'No free spins available. Watch an ad to unlock extra spins or purchase tickets.',
        freeSpinsUsed,
        maxFreeSpins,
        extraSpinsUnlocked,
        extraSpinsUsed,
        extraSpinsRemaining
      });
    }

    // Select winning segment based on probability
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    let winningSegment = config.segments[0];

    for (const segment of config.segments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        winningSegment = segment;
        break;
      }
    }

    // Update spin counts
    if (canUseFree) {
      spinTicket.freeSpinsUsed = (spinTicket.freeSpinsUsed || 0) + 1;
    } else if (canUseExtra) {
      spinTicket.extraSpinsUsed = (spinTicket.extraSpinsUsed || 0) + 1;
    }

    spinTicket.totalSpins += 1;
    spinTicket.totalWinnings += winningSegment.value;
    spinTicket.lastSpinDate = new Date();
    await spinTicket.save();

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId : telegramId});
    if (!wallet) {
      wallet = await Wallet.create({
        userId : telegramId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 }
      });
    }

    // Add winnings to wallet balance (XP)
    wallet.balances.xp += winningSegment.value;
    wallet.totalEarned.xp += winningSegment.value;
    wallet.lastTransaction = new Date();
    await wallet.save();

    // Also update user XP for backward compatibility
    user.xp = (user.xp || 0) + winningSegment.value;
    await user.save();

    // Record spin history
    await SpinHistory.create({
      userId : telegramId,
      segmentId: winningSegment.id,
      segmentLabel: winningSegment.label,
      winAmount: winningSegment.value,
      spinDate: new Date()
    });

    // Calculate next spin time
    const now = new Date();
    const lastReset = spinTicket.lastResetDate || now;
    const nextSpinTime = lastReset.getTime() + 24 * 60 * 60 * 1000;
 
    // Emit XP update
    io.emit('user:xp:update', {
      type: 'user:xp:update',
      telegramId,
      xp: wallet.balances.xp,
      timestamp: new Date()
    });

  
    

    return res.json({
      success: true,
      message: `Congratulations! You won ${winningSegment.label}`,
      data: {
        result: {
          prizeId: winningSegment.id,
          label: winningSegment.label,
          amount: winningSegment.value,
          color: winningSegment.color
        },
        nextSpinTime,
        freeSpinsUsed: spinTicket.freeSpinsUsed,
        extraSpinsUnlocked: spinTicket.extraSpinsUnlocked,
        extraSpinsUsed: spinTicket.extraSpinsUsed,
        extraSpinsRemaining: Math.max(0, spinTicket.extraSpinsUnlocked - spinTicket.extraSpinsUsed),
        spinsToday: spinTicket.freeSpinsUsed + Math.max(0, maxFreeSpins - spinTicket.freeSpinsUsed - (spinTicket.extraSpinsUnlocked - spinTicket.extraSpinsUsed))
      }
    });

  } catch (error) {
    console.error('Spin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

 

// POST /api/v1/spin-wheel/spin-with-ticket - Spin using a purchased ticket
router.post('/spin-wheel/spin-with-ticket', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.body;
    
    const { success: sigSuccess, data: sigData } = verifySignature(
      { signature, timestamp, hash },
      process.env.SPIN_WHEEL_SECRET_KEY || 'app'
    );

    if (!sigSuccess) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or expired timestamp'
      });
    }

     
    const { telegramId } = JSON.parse(sigData as string);

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findOne({ userId : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    // Get spin wheel config
    const config = await SpinWheelConfig.findOne({}).sort({ createdAt: -1 });
    if (!config || !config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Spin wheel is currently disabled'
      });
    }

    // Get or create spin ticket
    let spinTicket = await SpinTicket.findOne({ userId : telegramId});
    if (!spinTicket) {
      spinTicket = await SpinTicket.create({
        userId : telegramId,
        ticketCount: 0,
        totalPurchased: 0,
        totalSpins: 0,
        totalWinnings: 0,
        freeSpinsUsed: 0,
        extraSpinsUnlocked: 0,
        extraSpinsUsed: 0,
        lastResetDate: new Date()
      });
    }

    const maxFreeSpins = config.maxFreeSpins || 4;
    const maxExtraSpins = config.maxExtraSpins || 6;
    const freeSpinsUsed = spinTicket.freeSpinsUsed || 0;
    const extraSpinsUnlocked = spinTicket.extraSpinsUnlocked || 0;
    const ticketCount = spinTicket.ticketCount || 0;

    // Check if free spins are used up
    const freeSpinsExhausted = freeSpinsUsed >= maxFreeSpins;

    // If free spins are exhausted and tickets are 0, allow 6 extra spins
    if (freeSpinsExhausted && ticketCount === 0) {
      // Check if extra spins are available
      if (extraSpinsUnlocked <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No spins available. Watch an ad to unlock extra spins or purchase tickets.',
          freeSpinsUsed,
          maxFreeSpins,
          extraSpinsUnlocked,
          maxExtraSpins,
          availableTickets: 0
        });
      }
      // Will use extra spin
    } else if (ticketCount < 1) {
      // If tickets are 0 and free spins not exhausted, show error
      return res.status(400).json({
        success: false,
        message: 'No tickets available. Please purchase tickets first.',
        availableTickets: 0,
        freeSpinsUsed,
        maxFreeSpins
      });
    }

    // Select winning segment based on probability
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    let winningSegment = config.segments[0];

    for (const segment of config.segments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        winningSegment = segment;
        break;
      }
    }

    // Deduct ticket or extra spin
    if (freeSpinsExhausted && ticketCount === 0 && extraSpinsUnlocked > 0) {
      // Use extra spin
      spinTicket.extraSpinsUnlocked = Math.max(0, extraSpinsUnlocked - 1);
      spinTicket.extraSpinsUsed = (spinTicket.extraSpinsUsed || 0) + 1;
    } else {
      // Use regular ticket
      spinTicket.ticketCount -= 1;
    }
    
    spinTicket.totalSpins += 1;
    spinTicket.totalWinnings += winningSegment.value;
    spinTicket.lastSpinDate = new Date();
    await spinTicket.save();

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId : telegramId});
    if (!wallet) {
      wallet = await Wallet.create({
        userId : telegramId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 }
      });
    }

    // Add winnings to wallet balance (XP)
    wallet.balances.xp += winningSegment.value;
    wallet.totalEarned.xp += winningSegment.value;
    wallet.lastTransaction = new Date();
    await wallet.save();
    await user.save();

    // Record spin history
    await SpinHistory.create({
      userId : telegramId,
      segmentId: winningSegment.id,
      segmentLabel: winningSegment.label,
      winAmount: winningSegment.value,
      spinDate: new Date()
    });

    
    // Emit XP update
    io.emit('user:xp:update', {
      type: 'user:xp:update',
      telegramId,
      xp: wallet.balances.xp,
      timestamp: new Date()
    });
 

    return res.json({
      success: true,
      message: `Congratulations! You won ${winningSegment.label}`,
      data: {
        result: {
          prizeId: winningSegment.id,
          label: winningSegment.label,
          amount: winningSegment.value,
          color: winningSegment.color
        },
        spinTickets: spinTicket.ticketCount,
        extraSpinsUnlocked: spinTicket.extraSpinsUnlocked,
        extraSpinsUsed: spinTicket.extraSpinsUsed,
        freeSpinsUsed: spinTicket.freeSpinsUsed
      }
    });

  } catch (error) {
    console.error('Spin with Ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/spin-wheel/user-tickets/:userId - Get user's ticket info
router.get('/spin-wheel/user-tickets', async (req: Request, res: Response) => {
  try {
   const {  hash , timestamp , signature } = req.query;
   const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'app';
   const { success , data  } = verifySignature({ timestamp, signature, hash }, secretKey);

   if (!success) {
     return res.status(401).json({
       success: false,
       message: 'Invalid signature or request expired'
     });
   }
   

   const { telegramId } = JSON.parse(data as string);
    // Find user
    const user = await User.findOne({ userId : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get or create spin ticket
    let spinTicket = await SpinTicket.findOne({ userId : telegramId});
    if (!spinTicket) {
      spinTicket = await SpinTicket.create({
        userId : telegramId,
        ticketCount: 0,
        totalPurchased: 0,
        totalSpins: 0,
        totalWinnings: 0,
        freeSpinsUsed: 0,
        extraSpinsUnlocked: 0,
        extraSpinsUsed: 0
      });
    }

    return res.json({
      success: true,
      data: {
        userId : telegramId,
        ticketCount: spinTicket.ticketCount,
        totalPurchased: spinTicket.totalPurchased,
        totalSpins: spinTicket.totalSpins,
        totalWinnings: spinTicket.totalWinnings,
        freeSpinsUsed: spinTicket.freeSpinsUsed,
        extraSpinsUnlocked: spinTicket.extraSpinsUnlocked,
        extraSpinsUsed: spinTicket.extraSpinsUsed,
        lastPurchaseDate: spinTicket.lastPurchaseDate,
        lastSpinDate: spinTicket.lastSpinDate
      }
    });

  } catch (error :any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// GET /api/v1/spin-wheel/spin-history/:userId - Get user's spin history
router.get('/spin-wheel/spin-history', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const skip = (page - 1) * limit;

    // Get spin history
    const [history, total] = await Promise.all([
      SpinHistory.find({ userId })
        .sort({ spinDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      SpinHistory.countDocuments({ userId })
    ]);

    return res.json({
      success: true,
      data: {
        history,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get Spin History error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

 