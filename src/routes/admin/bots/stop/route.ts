import { Request, Response, Router } from 'express'
import { BotConfig } from 'models/BotConfig'
import { getWebhookInfo, removeWebhook } from 'services/webhook'

const router = Router()

export const stopBot = async (req: Request, res: Response) => {
  try {
    // Get bot configuration
    const botConfig = await BotConfig.findOne({})
    
    if (!botConfig) {
      return res.status(404).json({
        success: false,
        message: 'Bot configuration not found'
      })
    }
 
    
    const botInfo = await getWebhookInfo(botConfig.botToken);
    if(botInfo?.url){
      await removeWebhook(botConfig.botToken);
    }

    const updatedConfig = await BotConfig.findOneAndUpdate(
      {},
      { 
        Status: 'offline',
        lastUpdated: new Date()
      },
      { new: true }
    )

    return res.status(200).json({
      success: true,
      data: {
        config: {
          _id: updatedConfig._id,
          botToken: updatedConfig.botToken,
          botUsername: updatedConfig.botUsername,
          Status: updatedConfig.Status,
          webhookUrl: updatedConfig.webhookUrl,
          lastUpdated: updatedConfig.lastUpdated,
          createdAt: updatedConfig.createdAt,
          updatedAt: updatedConfig.updatedAt
        }
      },
      message: 'Bot stopped successfully'
    })

  } catch (error) {
    console.error('Bot stop API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to stop bot'
    })
  }
}

// Route definitions
router.post('/', stopBot)

export default router
