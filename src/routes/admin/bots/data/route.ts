import { Request, Response, Router } from 'express'
import { BotConfig } from 'models/BotConfig'
import { getBotInfo } from 'services/webhook'

const router = Router()

export const getBotData = async (req: Request, res: Response) => {
  try {
    // Find bot configuration
    const botConfig = await BotConfig.findOne({})
 
    if (!botConfig) {
      // Return default data if no config exists
      return res.status(200).json({
        success: true,
        data: {
          config: {
            botToken: '',
            botUsername: '',
            Status: 'offline',
            webhookUrl: '',
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          } 
      
        },
        message: 'No bot configuration found, returning default data'
      })
    }

    const botInfo = await getBotInfo(botConfig.botToken)

    if(botInfo.success && botInfo.data){
      botConfig.botUsername = botInfo.data.username;
      await botConfig.save();
    }

    console.log(botConfig)
    return res.status(200).json({
      success: true,
      data: {
        config: {
          _id: botConfig._id,
          botToken: botConfig.botToken,
          botUsername: botConfig.botUsername,
          Status: botConfig.botStatus,
          lastUpdated: botConfig.lastUpdated,
          createdAt: botConfig.createdAt,
          updatedAt: botConfig.updatedAt
        } 
      }
    })

  } catch (error) {
    console.error('Bot data GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bot data'
    })
  }
}

// Route definitions
router.get('/', getBotData)

export default router
