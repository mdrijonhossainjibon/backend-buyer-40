import { Router, Request, Response } from 'express'
import type { Router as ExpressRouter } from 'express'
import { verifySignature } from 'lib/auth';
import User from 'models/User'
import Activity from 'models/Activity'
import AdsSettings from 'models/AdsSettings'
import { Wallet } from 'models'
import { io } from '../../../server'

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/v1/ads/status:
 *   get:
 *     summary: Get ad watching status
 *     description: Retrieve the current ad watching status for a user, including how many ads they've watched today and if they can watch more
 *     tags: [Ads]
 *     parameters:
 *       - in: query
 *         name: timestamp
 *         required: true
 *         schema:
 *           type: string
 *         description: Request timestamp for signature verification
 *       - in: query
 *         name: signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Request signature for authentication
 *       - in: query
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *         description: Request hash containing user data
 *     responses:
 *       200:
 *         description: Ad status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Ad status retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     watchedToday:
 *                       type: number
 *                       example: 5
 *                     maxAdsPerDay:
 *                       type: number
 *                       example: 10
 *                     canWatchAd:
 *                       type: boolean
 *                       example: true
 *                     nextAdTime:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid signature or request expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/ads/status', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.query;

    if (!timestamp || !signature || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';
    const { success, data } = verifySignature({ timestamp, signature, hash }, secretKey);

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or request expired'
      });
    }

    const { telegramId } = JSON.parse(data as string);

    // Find user
    const user = await User.findOne({ userId: telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get ads settings
    const adsConfig = await AdsSettings.findOne().sort({ createdAt: -1 });
    if (!adsConfig) {
      return res.status(500).json({
        success: false,
        message: 'Ads settings not found'
      });
    }

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's ad watches
    const todayAdWatchCount = await Activity.countDocuments({
      userId: user.userId,
      activityType: 'ad_watch',
      status: 'completed',
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Check if user can watch more ads
    const canWatchAd = todayAdWatchCount < adsConfig.adsWatchLimit;

    // Calculate next ad time (if limit reached, it's tomorrow; otherwise, now)
    const nextAdTime = canWatchAd ? new Date() : tomorrow;

    return res.json({
      success: true,
      message: 'Ad status retrieved successfully',
      data: {
        watchedToday: todayAdWatchCount,
        maxAdsPerDay: adsConfig.adsWatchLimit,
        canWatchAd: canWatchAd,
        nextAdTime: nextAdTime.toISOString()
      }
    });

  } catch (error) {
    console.error('Get ad status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/ads/watch:
 *   post:
 *     summary: Watch an ad and earn rewards
 *     description: Record an ad watch event and credit the user's wallet with XP rewards. Enforces daily ad watch limits.
 *     tags: [Ads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timestamp
 *               - signature
 *               - hash
 *             properties:
 *               timestamp:
 *                 type: string
 *                 description: Request timestamp for signature verification
 *               signature:
 *                 type: string
 *                 description: Request signature for authentication
 *               hash:
 *                 type: string
 *                 description: Request hash containing user data
 *     responses:
 *       200:
 *         description: Ad watched successfully and rewards credited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Watch ads success
 *                 data:
 *                   type: object
 *                   properties:
 *                     earned:
 *                       type: number
 *                       example: 100
 *                       description: Amount of XP earned
 *                     watchedToday:
 *                       type: number
 *                       example: 6
 *                       description: Total ads watched today
 *       401:
 *         description: Invalid signature or request expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Daily ad limit reached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Daily ad limit reached! You can watch 10 ads per day. Try again tomorrow.
 *                 data:
 *                   type: object
 *                   properties:
 *                     watchedToday:
 *                       type: number
 *                     dailyAdLimit:
 *                       type: number
 *                     nextResetTime:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ads/watch', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'app';

    

    const { success , data } = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }
    

    const { telegramId } = JSON.parse(data as string)
     

    // Find user
    const user = await User.findOne({ userId  : telegramId });
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found'
      });

    }

    // Check if user is suspended
    if (user.status === 'suspend') {
      return res.status(403).json({
        success: false, 
        message: 'Your account has been suspended!'
      });
    }

    // Get ads settings for ad watch configuration
    const adsConfig = await AdsSettings.findOne().sort({ createdAt: -1 });
    if (!adsConfig) {
      return res.status(500).json({
        success: false, 
        message: 'Ads settings not found'
      });
    }

    
    // Check daily ad limit using activities and bot config
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAdWatchCount = await Activity.countDocuments({
      userId: user.userId,
      activityType: 'ad_watch',
      status: 'completed',
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })

    if (todayAdWatchCount >= adsConfig.adsWatchLimit) {
      return res.status(429).json({ 
        success: false, 
        message: `Daily ad limit reached! You can watch ${adsConfig.adsWatchLimit} ads per day. Try again tomorrow.`,
        data: {
          watchedToday: todayAdWatchCount,
          dailyAdLimit: adsConfig.adsWatchLimit,
          nextResetTime: tomorrow.toISOString()
        }
      });
    }

    // Ad earning amount from ads config
    const adEarning = adsConfig.defaultAdsReward
 
    // Get or create wallet
    let wallet = await Wallet.findOne({ userId : telegramId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId : telegramId  ,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 }
      });
    }
 
    wallet.balances.xp += adEarning;
    
    wallet.totalEarned.xp += adEarning;
    wallet.lastTransaction = new Date();
    await wallet.save();

    // Update user stats for backward compatibility
    user.watchedToday += 1;
    user.lastAdWatch = new Date();
    await user.save();

    // Log activity
    await Activity.create({
      userId: user.userId,
      activityType: 'ad_watch',
      description: `Watched rewarded ad and earned ${adEarning}`,
      amount: adEarning,
      status: 'completed',
      metadata: {
        adId: `ad_${Date.now()}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      }
    });


    io.emit('user:xp:update', {
      type: 'user:xp:update',
      telegramId,
      xp:  wallet.balances.xp,
      timestamp: new Date()
    });
  
    return res.json({
      success: true,
      message: 'Watch ads success',
      data: {
        earned: adEarning,
        watchedToday: todayAdWatchCount + 1,
      }
    })

  } catch (error) {
    console.error('Watch ad API error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;
