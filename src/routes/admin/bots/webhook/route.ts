import { Request, Response, Router } from 'express'
import { BotConfig } from 'models/BotConfig'
import { getWebhookInfo, setupWebhook } from 'services/webhook'

const router = Router()

export const setupBotWebhook = async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body

    // Validation
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL is required and must be a string'
      })
    }

    // Basic URL validation
    try {
      new URL(webhookUrl)
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL format'
      })
    }

    // Get bot configuration
    const botConfig = await BotConfig.findOne({})
    
    if (!botConfig || !botConfig.botToken) {
      return res.status(400).json({
        success: false,
        message: 'Bot token not configured. Please configure bot token first.'
      })
    }
 
    try {
      if(!webhookUrl.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: 'Webhook URL must be an HTTPS URL'
        })
      }

      const webhookInfo = await getWebhookInfo(botConfig.botToken)
      if(!webhookInfo?.url){
        await setupWebhook(botConfig.botToken, webhookUrl)
      }
      
      // For now, just update the webhook URL in our database
      const updatedConfig = await BotConfig.findOneAndUpdate(
        {},
        { 
          webhookUrl,
          lastUpdated: new Date()
        },
        { new: true, upsert: true }
      )

      return res.status(200).json({
        success: true,
        data: {
          webhookUrl: updatedConfig.webhookUrl,
          isSet: true
        },
        message: 'Webhook set successfully'
      })

    } catch (telegramError) {
      console.error('Telegram API error:', telegramError)
      return res.status(500).json({
        success: false,
        message: 'Failed to set webhook with Telegram API'
      })
    }

  } catch (error) {
    console.error('Webhook API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to set webhook'
    })
  }
}

// Route definitions
router.post('/', setupBotWebhook)

export default router
