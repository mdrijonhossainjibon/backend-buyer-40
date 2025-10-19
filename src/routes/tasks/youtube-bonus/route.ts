import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from 'models/User'
import Activity from 'models/Activity'
import { getYouTubeSubscriberCount } from './youtubeApi'

const router = Router();

router.post('/youtube-bonus', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const userId = parseInt(result.data as string);


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

    // Check if user already claimed YouTube bonus
    if (user.youtubeBonus > 0) {
      return res.status(400).json({
        success: false, 
        message: 'YouTube bonus already claimed!'
      });
    }

    // Get real subscriber count from YouTube API
    const channelId = 'UCIZAXemyhC5YC8f3vk7vJ1w' // Replace with actual channel ID
    const youtubeResult = await getYouTubeSubscriberCount(channelId)
    
    if (!youtubeResult.success) {
      return res.status(400).json({
        success: false, 
        message: `Failed to verify YouTube channel: ${youtubeResult.error}`
      });
    }

    const subscriberCount = youtubeResult.subscriberCount || 0

    // YouTube bonus amount
    const bonusAmount = 7

    // Update user stats
    user.youtubeBonus = bonusAmount
    user.balanceTK += bonusAmount
    await user.save()

    // Log activity
    await Activity.create({
      userId: user.userId,
      activityType: 'bonus',
      description: `Claimed YouTube subscription bonus and earned ${bonusAmount} BDT`,
      amount: bonusAmount,
      status: 'completed',
      metadata: {
        taskId: 'youtube_subscribe',
        bonusType: 'youtube',
        subscriberCount: subscriberCount,
        channelId: channelId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      }
    })

    return res.json({
      success: true,
      message: `YouTube bonus claimed! You earned ${bonusAmount} BDT!`,
      data: {
        earned: bonusAmount,
        newBalance: user.balanceTK,
        youtubeBonus: user.youtubeBonus,
        subscriberCount: subscriberCount
      }
    })

  } catch (error) {
    console.error('YouTube bonus API error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;
