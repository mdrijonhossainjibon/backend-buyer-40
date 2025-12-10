import TelegramBot from 'node-telegram-bot-api'
import { getBotConfig } from '../config/telegram'

/**
 * Extract channel/group ID from Telegram link
 * Supports formats:
 * - https://t.me/channelname
 * - https://t.me/joinchat/xxxxx
 * - @channelname
 */
export function extractTelegramId(link: string): string {
  if (link.startsWith('@')) {
    return link
  }
  
  const match = link.match(/t\.me\/([^/?]+)/)
  if (match) {
    return '@' + match[1]
  }
  
  return link
}

/**
 * Check if a user is a member of a Telegram channel/group
 * @param userId - Telegram user ID
 * @param channelId - Channel/Group ID or username (e.g., @channelname or -100123456789)
 * @returns Promise<boolean> - true if user is a member, false otherwise
 */
export async function checkTelegramMembership(
  userId: number,
  channelId: string
): Promise<{ isMember: boolean; status?: string; error?: string }> {
  try {
    const botConfig = await getBotConfig()
    const bot = new TelegramBot(botConfig.botToken, { polling: false })

    try {
      const chatMember = await bot.getChatMember(channelId, userId)
      
      // Member statuses: creator, administrator, member, restricted, left, kicked
      const validStatuses = ['creator', 'administrator', 'member', 'restricted']
      const isMember = validStatuses.includes(chatMember.status)
      
      return {
        isMember,
        status: chatMember.status
      }
    } catch (error: any) {
      // Handle specific Telegram API errors
      if (error.response?.body?.error_code === 400) {
        return {
          isMember: false,
          error: 'User not found in channel/group'
        }
      }
      
      throw error
    }
  } catch (error: any) {
    console.error('Telegram membership check error:', error)
    return {
      isMember: false,
      error: error.message || 'Failed to verify membership'
    }
  }
}

/**
 * Send notification to user via Telegram
 * @param userId - Telegram user ID
 * @param message - Message to send
 */
export async function sendTelegramNotification(
  userId: number,
  message: string,
  options?: TelegramBot.SendMessageOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const botConfig = await getBotConfig()
    const bot = new TelegramBot(botConfig.botToken, { polling: false })

    await bot.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...options
    })

    return { success: true }
  } catch (error: any) {
    console.error('Send Telegram notification error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send notification'
    }
  }
}
