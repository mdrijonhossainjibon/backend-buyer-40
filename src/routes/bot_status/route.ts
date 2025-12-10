import { Router, Request, Response } from 'express'
import { verifySignature } from 'lib/auth';
import { BotConfig } from 'models/BotConfig'
import { User } from 'models';

 

const router = Router();

router.post('/bot_status', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const {  telegramId } = JSON.parse(result.data as string);
 
   
     const referralCount = await User.countDocuments({  referredBy :   telegramId  })

 

    // Find bot configuration record
    const botConfig = await BotConfig.findOne({ });
  
    if (!botConfig) {
      return res.status(404).json({
        success: false, 
        message: 'Bot not Configured'
      });
    }

    // Update last seen timestamp
    botConfig.lastUpdated = new Date()
    await botConfig.save()

    const response  = {
      success: true,
      data: {
        botUsername: botConfig.botUsername,
        botStatus: botConfig.Status,
        botVersion: '1.0.0',
        referralCount 
      }
    }

    return res.json(response);

  } catch (error) {
    console.error('Bot status API error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;

 