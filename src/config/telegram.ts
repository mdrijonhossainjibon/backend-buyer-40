import TelegramBot from 'node-telegram-bot-api';
import { BotConfig } from 'models/BotConfig'
// Message Templates
export const MESSAGE_TEMPLATES = {
  WELCOME_NEW_USER: (firstName: string, balance: number, referralCode: string) =>
    `🎉 *Welcome to EarnFrom, ${firstName}!*\n\n` +
    `✅ Your account has been created successfully!\n` +
    `💰 Starting Balance: ${balance} TK\n` +
    `🔗 Your Referral Code: \`${referralCode}\`\n\n` +
    `🚀 Start earning by:\n` +
    `• Completing tasks\n` +
    `• Referring friends\n` +
    `• Using our mini app\n\n` +
    `Use the buttons below to navigate! 👇`,

  WELCOME_BACK: (firstName: string, balance: number, referralCode: string) =>
    `👋 *Welcome back, ${firstName}!*\n\n` +
    `💰 Current Balance: ${balance} TK\n` +
    `🔗 Your Referral Code: \`${referralCode}\`\n\n` +
    `What would you like to do today? 👇`,

  BALANCE_INFO: (balance: number, totalEarned: number, withdrawn: number, referralCount: number) =>
    `💰 *Your Balance Information*\n\n` +
    `💵 Current Balance: *${balance} TK*\n` +
    `📈 Total Earned: *${totalEarned} TK*\n` +
    `💸 Total Withdrawn: *${withdrawn} TK*\n` +
    `👥 Referrals: *${referralCount}*\n\n` +
    `Keep earning more! 🚀`,

  REFERRAL_INFO: (referralCode: string, referralCount: number, referralBonus: number = 10) =>
    `🔗 *Your Referral Information*\n\n` +
    `📋 Referral Code: \`${referralCode}\`\n` +
    `👥 Total Referrals: *${referralCount}*\n` +
    `💰 Bonus per Referral: *${referralBonus} TK*\n\n` +
    `Share your referral link and earn ${referralBonus} TK for each friend who joins! 🎉`,

  HELP_MESSAGE: (referralBonus: number = 10) =>
    `❓ *Help & Commands*\n\n` +
    `Available commands:\n` +
    `• /start - Start or restart the bot\n` +
    `• /balance - Check your balance\n` +
    `• /reflink - Get your referral link\n` +
    `• /help - Show this help message\n\n` +
    `🎯 *How to Earn:*\n` +
    `• Complete daily tasks\n` +
    `• Refer friends (+${referralBonus} TK each)\n` +
    `• Use our mini app for more opportunities\n\n` +
    `Need more help? Contact our support team! 💬`,

  DEFAULT_RESPONSE: () =>
    `🤖 *Hello!*\n\n` +
    `I didn't understand that message. Please use the buttons below or try one of these commands:\n\n` +
    `• /balance - Check your balance\n` +
    `• /reflink - Get referral link\n` +
    `• /help - Get help\n\n` +
    `Use the keyboard buttons for easy navigation! 👇`,

  ERROR_MESSAGE: () =>
    `❌ *Oops! Something went wrong.*\n\n` +
    `Please try again in a moment. If the problem persists, contact our support team.\n\n` +
    `You can also try using /start to refresh your session.`,

  USER_NOT_FOUND: () =>
    `👤 *Account Not Found*\n\n` +
    `It looks like you haven't registered yet. Please click the button below to get started!\n\n` +
    `🚀 Registration is quick and free!`,

  REFERRAL_SUCCESS: (referrerName: string, bonus: number) =>
    `🎉 *New Referral!*\n\n` +
    `${referrerName} just joined using your referral link!\n` +
    `💰 You earned *${bonus} TK* bonus!\n\n` +
    `Keep sharing and keep earning! 🚀`,

  NEW_USER_REGISTERED: (firstName: string, referralCode: string, balance: number) =>
    `✅ *Registration Complete!*\n\n` +
    `Welcome ${firstName}! Your account is ready.\n` +
    `🔗 Referral Code: \`${referralCode}\`\n` +
    `💰 Starting Balance: ${balance} TK\n\n` +
    `Start earning now! 🚀`,

  BOT_OFFLINE: () =>
    `🚫 *Bot is Currently Offline*\n\n` +
    `Sorry, the bot is temporarily unavailable for maintenance.\n` +
    `Please try again later.\n\n` +
    `Thank you for your patience! 🙏`,

  WEB_APP_WELCOME: (firstName: string) =>
    `🎉 *Welcome to EarnFrom Bot!*\n\n` +
    `Hi ${firstName}! Thank you for allowing me to message you through our web app.\n\n` +
    `🚀 *What you can do now:*\n` +
    `• Check your balance with /balance\n` +
    `• Get your referral link with /reflink\n` +
    `• Complete tasks and earn rewards\n` +
    `• Invite friends and get bonuses\n\n` +
    `Let's start earning together! 💰`
};

// Create Telegram Bot instance using BotConfig from database
export async function createTelegramBot(): Promise<TelegramBot> {
  try {
    // Get bot configuration from database
    const botConfig = await BotConfig.findOne();

    if (!botConfig || !botConfig.botToken) {
      throw new Error('Bot configuration not found in database or bot token is missing');
    }

    const bot = new TelegramBot(botConfig.botToken, { polling: true });

    return bot;
  } catch (error) {
    console.error('Error creating Telegram bot:', error);
    throw error;
  }
}

// Get bot configuration from database
export async function getBotConfig() {
  try {
    let botConfig = await BotConfig.findOne();

    // If no bot configuration exists, create a default one
    if (!botConfig) {
      console.log('No bot configuration found, creating default configuration...');

      botConfig = await BotConfig.create({
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        botUsername: process.env.TELEGRAM_BOT_USERNAME || 'EarnFromBot',
        botStatus: 'online',
        botLastSeen: new Date(),
        botVersion: 'v2.1.0'
      });

      console.log('Default bot configuration created successfully');
    }

    return botConfig;
  } catch (error) {
    console.error('Error getting bot config:', error);
    throw error;
  }
}
