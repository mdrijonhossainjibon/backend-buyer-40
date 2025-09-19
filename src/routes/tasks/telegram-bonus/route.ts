import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from '@/models/User'
import Activity from '@/models/Activity'
import { BotConfig } from '@/models/BotConfig'
import { checkTelegramChannelJoin } from '@/services/webhook'

const router = Router();

router.post('/telegram-bonus', async (req: Request, res: Response) => {
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

    // Check if user already claimed telegram bonus
    if (user.telegramBonus > 0) {
      return res.status(400).json({
        success: false, 
        message: 'Telegram bonus already claimed!'
      });
    }

    // Get bot configuration
    const botConfig = await BotConfig.findOne({ Status: 'online' });
    if (!botConfig) {
      return res.status(503).json({
        success: false, 
        message: 'Bot is currently offline'
      });
    }

    // Verify user has joined the Telegram channel
    // You should configure the channel ID in your environment or bot config
    const channelId = '@earnfromads1'
    const membershipCheck = await checkTelegramChannelJoin(
      botConfig.botToken,
      channelId,
      Number(userId)
    ); 
 
    if (!membershipCheck.success) {
      return res.status(500).json({
        success: false, 
        message: 'Unable to verify channel membership. Please try again.'
      });
    }

    if (!membershipCheck.isMember) {
      return res.status(400).json({
        success: false, 
        message: 'You must join our Telegram channel first to claim this bonus!'
      });
    }

    // Telegram bonus amount
    const bonusAmount = 15

    // Update user stats
    user.telegramBonus = bonusAmount
    user.balanceTK += bonusAmount
    await user.save()

    // Log activity
    await Activity.create({
      userId: user.userId,
      activityType: 'bonus',
      description: `Claimed Telegram channel bonus and earned ${bonusAmount} TK`,
      amount: bonusAmount,
      status: 'completed',
      metadata: {
        taskId: 'telegram_channel_join',
        bonusType: 'telegram',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      }
    })

    return res.json({
      success: true,
      message: `Channel bonus claimed! You earned ${bonusAmount} TK!`,
      data: {
        earned: bonusAmount,
        newBalance: user.balanceTK,
        telegramBonus: user.telegramBonus
      }
    })

  } catch (error) {
    console.error('Telegram bonus API error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;
