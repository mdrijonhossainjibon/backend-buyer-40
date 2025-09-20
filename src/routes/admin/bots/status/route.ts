import { Request, Response, Router } from 'express'
 
import { BotConfig } from 'models/BotConfig'
import { getBotInfo } from 'services/webhook'

const router = Router()

export const getBotStatus = async (req: Request, res: Response) => {
  try {
     
    // Find bot configuration to get status
    const botConfig = await BotConfig.findOne({})

    
    if (!botConfig) {
      return res.status(404).json({
        success: false,
        message: 'No bot configuration found'
      })
    }


    const botInfo = await getBotInfo(botConfig.botToken);

    if(botInfo.success && botInfo.data){
      botConfig.botUsername = botInfo.data.username;
      await botConfig.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        status: {
          _id: botConfig._id,
          botUsername: botConfig.botUsername,
          botStatus: botConfig.Status,
          botLastSeen: botConfig.lastUpdated,
          botVersion: 'v2.1.0', // This could be stored in config or fetched from bot
          createdAt: botConfig.createdAt,
          updatedAt: botConfig.updatedAt
        }
      }
    })

  } catch (error) {
    console.error('Bot status GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bot status'
    })
  }
}

export const updateBotStatus = async (req: Request, res: Response) => {
  try {
  
    
    const { status } = req.body

    // Validation
    if (!status || !['online', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: online, offline, maintenance'
      })
    }
 

    const botConfig = await BotConfig.findOne({})

    if (!botConfig) {
      return res.status(404).json({
        success: false,
        message: 'No bot configuration found'
      })
    }

    const botInfo = await getBotInfo(botConfig.botToken);

    if(botInfo.success && botInfo.data){
      botConfig.botUsername = botInfo.data.username;
      await botConfig.save();
    }
    botConfig.Status = status;
    await botConfig.save();

    
    return res.status(200).json({
      success: true,
      data: {
        status: {
          _id: botConfig._id,
          botUsername: botConfig.botUsername,
          botStatus: status, // Return the original status including maintenance
          botLastSeen: botConfig.lastUpdated,
          botVersion: 'v2.1.0',
          createdAt: botConfig.createdAt,
          updatedAt: botConfig.updatedAt
        }
      },
      message: `Bot status updated to ${status}`
    })

  } catch (error : any) {
    console.error('Bot status PUT API error:', error)
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update bot status'
    })
  }
}

// Route definitions
router.get('/', getBotStatus)
router.put('/', updateBotStatus)

export default router
