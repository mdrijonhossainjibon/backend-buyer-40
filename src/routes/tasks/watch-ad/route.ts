import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from '@/models/User'
import Activity from '@/models/Activity'
import AdsSettings from '@/models/AdsSettings'

const router = Router();

router.post('/watch-ad', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const { userId } = JSON.parse(result.data as string);

    // Find user
    const user = await User.findOne({ userId });
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
 
    // Update user stats
    user.watchedToday += 1
    user.balanceTK += adEarning
    user.totalEarned += adEarning
    user.lastAdWatch = new Date()
    await user.save()

    // Log activity
    await Activity.create({
      userId: user.userId,
      activityType: 'ad_watch',
      description: `Watched rewarded ad and earned ${adEarning} BDT`,
      amount: adEarning,
      status: 'completed',
      metadata: {
        adId: `ad_${Date.now()}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      }
    })

    return res.json({
      success: true,
      message: `Ad watched! You earned ${adEarning} BDT!`,
      data: {
        earned: adEarning,
        newBalance: user.balanceTK,
        watchedToday: todayAdWatchCount + 1, // +1 because we just added a new activity
        dailyAdLimit: adsConfig.adsWatchLimit
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
