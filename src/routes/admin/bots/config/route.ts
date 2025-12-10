import { Request, Response, Router } from 'express'
import { BotConfig } from 'models/BotConfig'
import { getBotInfo } from 'services/webhook'

const router = Router()

export const getBotConfig = async (req: Request, res: Response) => {
  try {
    // Find bot configuration (assuming there's only one bot config)
    const botConfig = await BotConfig.findOne({})
    
    if (!botConfig) {
      // Return default config if none exists
      return res.status(200).json({
        success: true,
        data: {
          config: {
            botToken: '',
            botUsername: '',
            Status: 'offline',
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        message: 'No bot configuration found, returning default'
      })
    }

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
    console.error('Bot config GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bot configuration'
    })
  }
}

export const updateBotConfig = async (req: Request, res: Response) => {
  try {
    const { botToken,  Status } = req.body

    // Validation
    if (botToken && typeof botToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Bot token must be a string'
      })
    }

 

    if (Status && !['online', 'offline'].includes(Status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either online or offline'
      })
    }

    // Prepare update data
    const updateData: any = {
      lastUpdated: new Date()
    }



    if (botToken !== undefined) updateData.botToken = botToken
    
    if (Status !== undefined) updateData.Status = Status

    const info = await getBotInfo(botToken);

    if(info.success && info.data){
       updateData.botUsername = info.data.username;
    }

    const botConfig = await BotConfig.findOneAndUpdate({}, updateData, { new: true });

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
      },
      message: 'Bot configuration updated successfully'
    })

  } catch (error : any) {
    console.error('Bot config PUT API error:', error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      })
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Bot token already exists'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update bot configuration'
    })
  }
}

// Route definitions
router.get('/', getBotConfig)
router.put('/', updateBotConfig)

export default router
