import { Router, Request, Response } from 'express';
import { UserMysteryBox, MysteryBoxSettings, User, Wallet , Activity  } from 'models';
import SpinTicket from 'models/SpinTicket';
import { verifySignature } from 'lib/auth';
const router = Router();

// Helper function to check eligibility
async function checkEligibility(userId: number) {
  const settings = await MysteryBoxSettings.findOne({}).sort({ createdAt: -1 });
  
  if (!settings || !settings.enabled) {
    return { isEligible: false, canClaim: false, settings: null };
  }

  let userBox = await UserMysteryBox.findOne({ userId });
  
  if (!userBox) {
    userBox = await UserMysteryBox.create({
      userId,
      tasksCompleted: 0,
      spinsCompleted: 0,
      adsWatched: 0,
      daysActive: 0,
      totalXP: 0,
      isEligible: false,
      canClaim: false,
      nextAvailableAt: null,
      boxesClaimedToday: 0,
      totalBoxesClaimed: 0,
      totalUSDTEarned: 0,
      totalXPEarned: 0,
      totalTicketsEarned: 0,
      jackpotsWon: 0,
      lastClaimAt: null,
      lastActivityAt: new Date()
    });
  }

  // Fetch activity data from Activity model
  const tasksCompleted = await Activity.countDocuments({
    userId,
    activityType: 'task_complete',
    status: 'completed'
  });

  const adsWatched = await Activity.countDocuments({
    userId,
    activityType: 'ad_watch',
    status: 'completed'
  });

  // Calculate days active (unique days with login activity)
  const loginActivities = await Activity.find({
    userId,
    activityType: 'login',
    status: 'completed'
  }).select('createdAt');

  const uniqueDays = new Set(
    loginActivities.map(activity => {
      const date = new Date(activity.createdAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    })
  );
  const daysActive = uniqueDays.size;

  // Get user's total XP from Wallet
  const wallet = await Wallet.findOne({ userId });
  const totalXP = wallet?.balances.xp || 0;

  // Check if user meets requirements
  const meetsRequirements = 
    tasksCompleted >= settings.requirements.minTasksCompleted &&
    adsWatched >= settings.requirements.minAdsWatched &&
    daysActive >= settings.requirements.minDaysActive &&
    totalXP >= settings.requirements.minTotalXP;

  userBox.isEligible = meetsRequirements;

  // Check if can claim (cooldown and daily limit)
  const now = new Date();
  let canClaim = false;

  if (meetsRequirements) {
    // Reset daily count if it's a new day
    if (userBox.lastClaimAt) {
      const lastClaimDate = new Date(userBox.lastClaimAt);
      const isNewDay = now.getDate() !== lastClaimDate.getDate() ||
                       now.getMonth() !== lastClaimDate.getMonth() ||
                       now.getFullYear() !== lastClaimDate.getFullYear();
      
      if (isNewDay) {
        userBox.boxesClaimedToday = 0;
      }
    }

    // Check daily limit
    if (userBox.boxesClaimedToday < settings.maxBoxesPerDay) {
      // Check cooldown
      if (!userBox.nextAvailableAt || now >= userBox.nextAvailableAt) {
        canClaim = true;
        userBox.nextAvailableAt = null;
      }
    }
  }

  userBox.canClaim = canClaim;
  await userBox.save();

  return { 
    isEligible: meetsRequirements, 
    canClaim, 
    settings, 
    userBox,
    activityData: {
      tasksCompleted,
      adsWatched,
      daysActive,
      totalXP
    }
  };
}

// Helper function to generate random reward
function generateReward(settings: any) {
  const random = Math.random() * 100;
  
  // Check for jackpot
  if (random < settings.rewards.jackpotProbability) {
    return {
      type: 'jackpot',
      amount: settings.rewards.jackpotUSDT,
      label: `💎 JACKPOT! ${settings.rewards.jackpotUSDT} USDT`,
      isJackpot: true
    };
  }

  // Randomly select reward type
  const rewardTypes = ['usdt', 'xp', 'tickets'];
  const selectedType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];

  let amount = 0;
  let label = '';

  switch (selectedType) {
    case 'usdt':
      amount = parseFloat((Math.random() * (settings.rewards.maxUSDT - settings.rewards.minUSDT) + settings.rewards.minUSDT).toFixed(2));
      label = `${amount} USDT`;
      break;
    case 'xp':
      amount = Math.floor(Math.random() * (settings.rewards.maxXP - settings.rewards.minXP) + settings.rewards.minXP);
      label = `${amount} XP`;
      break;
    case 'tickets':
      amount = Math.floor(Math.random() * (settings.rewards.maxTickets - settings.rewards.minTickets) + settings.rewards.minTickets);
      label = `${amount} Spin Ticket${amount > 1 ? 's' : ''}`;
      break;
  }

  return {
    type: selectedType,
    amount,
    label,
    isJackpot: false
  };
}

// GET /api/v1/mystery-box/status - Get user's mystery box status
router.get('/mystery-box/status', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.query;
    
    const { success, data } = verifySignature(
      { signature, timestamp, hash },
      process.env.MYSTERY_BOX_SECRET_KEY || 'app'
    );

    if (!success || !data) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { userId } = JSON.parse(data as string);
    const { isEligible, canClaim, settings, userBox, activityData } = await checkEligibility(userId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Mystery box feature is not enabled'
      });
    }

    return res.json({
      success: true,
      data: {
        isEligible  ,
        canClaim  ,
        nextAvailableAt: userBox?.nextAvailableAt ? userBox.nextAvailableAt.getTime() : null,
        boxesClaimedToday: userBox?.boxesClaimedToday || 0,
        maxBoxesPerDay: settings.maxBoxesPerDay,
        progress: {
          tasksCompleted: activityData?.tasksCompleted || 10,
          spinsCompleted: userBox?.spinsCompleted || 5,
          adsWatched: activityData?.adsWatched || 0,
          daysActive: activityData?.daysActive || 0,
          totalXP: activityData?.totalXP || 0
        },
        requirements: settings.requirements,
        stats: {
          totalBoxesClaimed: userBox?.totalBoxesClaimed || 0,
          totalUSDTEarned: userBox?.totalUSDTEarned || 0,
          totalXPEarned: userBox?.totalXPEarned || 0,
          totalTicketsEarned: userBox?.totalTicketsEarned || 0,
          jackpotsWon: userBox?.jackpotsWon || 0
        }
      }
    });
  } catch (error) {
    console.error('Mystery Box Status GET error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/mystery-box/claim - Claim a mystery box
router.post('/mystery-box/claim', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.body;
    
    const { success, data } = verifySignature(
      { signature, timestamp, hash },
      process.env.MYSTERY_BOX_SECRET_KEY || 'app'
    );

    if (!success || !data) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { userId } = JSON.parse(data as string);
    const { isEligible, canClaim, settings, userBox } = await checkEligibility(userId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Mystery box feature is not enabled'
      });
    }

    if (!canClaim) {
      return res.status(400).json({
        success: false,
        message: 'You cannot claim a mystery box at this time'
      });
    }

    // Generate reward
    const reward = generateReward(settings);

    // Update user's wallet/balance based on reward type
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ userId });
    const newBalance: any = {};

    switch (reward.type) {
      case 'usdt':
      case 'jackpot':
        if (wallet) {
          (wallet as any).available.usdt += reward.amount;
          await wallet.save();
          newBalance.usdt = (wallet as any).available.usdt;
        }
        userBox!.totalUSDTEarned += reward.amount;
        if (reward.isJackpot) {
          userBox!.jackpotsWon += 1;
        }
        break;
      
      case 'xp':
        user.balanceTK += reward.amount;
        await user.save();
        newBalance.xp = user.balanceTK;
        userBox!.totalXPEarned += reward.amount;
        break;
      
      case 'tickets':
        let userTickets = await SpinTicket.findOne({ userId });
        if (!userTickets) {
          userTickets = await SpinTicket.create({
            userId,
            ticketCount: reward.amount,
            totalPurchased: 0,
            totalSpins: 0,
            totalWinnings: 0
          });
        } else {
          userTickets.ticketCount += reward.amount;
          await userTickets.save();
        }
        newBalance.tickets = userTickets.ticketCount;
        userBox!.totalTicketsEarned += reward.amount;
        break;
    }

    // Update mystery box status
    const now = new Date();
    userBox!.boxesClaimedToday += 1;
    userBox!.totalBoxesClaimed += 1;
    userBox!.lastClaimAt = now;
    
    // Set next available time
    const nextAvailable = new Date(now.getTime() + settings.cooldownHours * 60 * 60 * 1000);
    userBox!.nextAvailableAt = nextAvailable;
    userBox!.canClaim = false;
    
    await userBox!.save();

    return res.json({
      success: true,
      data: {
        reward,
        newBalance,
        nextAvailableAt: nextAvailable.getTime(),
        boxesClaimedToday: userBox!.boxesClaimedToday
      }
    });
  } catch (error) {
    console.error('Mystery Box Claim POST error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/mystery-box/update-activity - Update user activity
router.post('/mystery-box/update-activity', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.body;
    
    const { success, data } = verifySignature(
      { signature, timestamp, hash },
      process.env.MYSTERY_BOX_SECRET_KEY || 'app'
    );

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { userId, activityType, xpEarned } = JSON.parse(data as string);

    let userBox = await UserMysteryBox.findOne({ userId });
    
    if (!userBox) {
      userBox = await UserMysteryBox.create({
        userId,
        tasksCompleted: 0,
        spinsCompleted: 0,
        adsWatched: 0,
        daysActive: 1,
        totalXP: 0,
        isEligible: false,
        canClaim: false,
        nextAvailableAt: null,
        boxesClaimedToday: 0,
        totalBoxesClaimed: 0,
        totalUSDTEarned: 0,
        totalXPEarned: 0,
        totalTicketsEarned: 0,
        jackpotsWon: 0,
        lastClaimAt: null,
        lastActivityAt: new Date()
      });
    }

    // Update activity based on type
    switch (activityType) {
      case 'task':
        userBox.tasksCompleted += 1;
        break;
      case 'spin':
        userBox.spinsCompleted += 1;
        break;
      case 'ad':
        userBox.adsWatched += 1;
        break;
    }

    // Update XP if provided
    if (xpEarned) {
      userBox.totalXP += xpEarned;
    }

    // Update days active
    const now = new Date();
    const lastActivity = new Date(userBox.lastActivityAt);
    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 1) {
      userBox.daysActive += daysDiff;
    }
    
    userBox.lastActivityAt = now;
    await userBox.save();

    // Re-check eligibility
    await checkEligibility(userId);

    return res.json({
      success: true,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    console.error('Mystery Box Update Activity POST error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/mystery-box/settings - Get mystery box settings (Admin)
router.get('/mystery-box/settings', async (req: Request, res: Response) => {
  try {
    let settings = await MysteryBoxSettings.findOne({}).sort({ createdAt: -1 });

    // If no settings exist, create default
    if (!settings) {
      settings = await MysteryBoxSettings.create({
        enabled: true,
        requirements: {
          minTasksCompleted: 5,
          minSpinsCompleted: 3,
          minAdsWatched: 10,
          minDaysActive: 1,
          minTotalXP: 100
        },
        cooldownHours: 24,
        maxBoxesPerDay: 3,
        rewards: {
          minUSDT: 0.01,
          maxUSDT: 1.0,
          minXP: 50,
          maxXP: 500,
          minTickets: 1,
          maxTickets: 5,
          jackpotUSDT: 10.0,
          jackpotProbability: 0.1
        }
      });
    }

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Mystery Box Settings GET error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/v1/mystery-box/settings - Update mystery box settings (Admin)
router.put('/mystery-box/settings', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, hash } = req.body;
    
    const { success, data } = verifySignature(
      { signature, timestamp, hash },
      process.env.MYSTERY_BOX_SECRET_KEY || 'app'
    );

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { settings: newSettings } = JSON.parse(data as string);

    let settings = await MysteryBoxSettings.findOne({}).sort({ createdAt: -1 });

    if (!settings) {
      settings = await MysteryBoxSettings.create(newSettings);
    } else {
      Object.assign(settings, newSettings);
      await settings.save();
    }

    return res.json({
      success: true,
      data: {
        settings,
        message: 'Settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Mystery Box Settings PUT error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
