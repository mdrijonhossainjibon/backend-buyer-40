import TelegramBot from 'node-telegram-bot-api';
import User from '../models/User';
import { MESSAGE_TEMPLATES, createTelegramBot, getBotConfig } from '../config/telegram';

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private isInitialized = false;
  private botConfig: any = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.botConfig = await getBotConfig();

      // Check if bot is offline
      if (this.botConfig.botStatus === 'offline') {
        console.log('🚫 Telegram Bot is offline - not initializing');
        return;
      }

      this.bot = await createTelegramBot(); // Use polling for development
      this.initializeBot();
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
    }
  }

  private initializeBot(): void {
    if (this.isInitialized || !this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      await this.handleStartCommand(msg, match?.[1]);
    });

    // Handle /balance command
    this.bot.onText(/\/balance/, async (msg) => {
      await this.handleBalanceCommand(msg);
    });

    // Handle /reflink command
    this.bot.onText(/\/reflink/, async (msg) => {
      await this.handleRefLinkCommand(msg);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelpCommand(msg);
    });

    // Handle all other messages
    this.bot.on('message', async (msg) => {
      // Skip if it's a command (starts with /)
      if (msg.text?.startsWith('/')) return;

      await this.handleDefaultMessage(msg);
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('Telegram Bot Error:', error);
    });

    this.isInitialized = true;
    console.log('🤖 Telegram Bot Service initialized successfully');
  }

  /**
   * Check if bot is offline and send appropriate message
   */
  private async checkBotStatus(chatId: number): Promise<boolean> {
    if (this.botConfig?.botStatus === 'offline') {
      await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.BOT_OFFLINE(), {
        parse_mode: 'Markdown'
      });
      return false;
    }
    return true;
  }

  /**
   * Handle /start command with optional referral code
   */
  private async handleStartCommand(msg: TelegramBot.Message, referralCode?: string): Promise<void> {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const firstName = msg.from?.first_name || 'User';
      const username = msg.from?.username;

      // Only handle private chats, not groups or channels
      if (msg.chat.type !== 'private') {
        console.log(`Ignoring message from ${msg.chat.type} chat: ${chatId}`);
        return;
      }

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      if (!userId) {
        await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.ERROR_MESSAGE());
        return;
      }

      // Check if user already exists
      let user = await User.findOne({ userId });

      if (user) {

        const fullName = `${msg.chat.first_name ?? ""} ${msg.chat.last_name ?? ""}`.trim();

        const message = `
✅ *Welcome ${fullName}* ▪️ 🎖️

Click the *"Start Earning"* button below to open the Web Mini App and start earning.  
👉 Click the button below to start now.  

📺 Watch the tutorial video for better understanding.  
`;

        await this.bot?.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Start Earning", web_app: { url: "https://buyer-40.vercel.app" } }
              ],
           /*    [
                { text: "🎥 Tutorial Video", url: "https://youtu.be/WfZ2mvsOXAo?si=r5yRIqLyI9NbfQah" }
              ] */
            ]
          }
        });


        // Update last login
        user.lastLogin = new Date();
        await user.save();
        return;
      }


    } catch (error) {
      console.error('Error in handleStartCommand:', error);
      if (msg.chat?.id && msg.chat.type === 'private') {
        await this.bot?.sendMessage(msg.chat.id, MESSAGE_TEMPLATES.ERROR_MESSAGE());
      }
    }
  }

  /**
   * Handle /balance command
   */
  private async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      // Only handle private chats
      if (msg.chat.type !== 'private') {
        return;
      }

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      if (!userId) {
        await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.ERROR_MESSAGE());
        return;
      }

      const user = await User.findOne({ userId });

      if (!user) {
        await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.USER_NOT_FOUND(), {
          reply_markup: this.getStartKeyboard()
        });
        return;
      }

      const message = MESSAGE_TEMPLATES.BALANCE_INFO(
        user.balanceTK,
        user.totalEarned || user.balanceTK,
        user.withdrawnAmount || 0,
        user.referralCount
      );

      await this.bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainKeyboard()
      });
    } catch (error) {
      console.error('Error in handleBalanceCommand:', error);
      if (msg.chat?.id && msg.chat.type === 'private') {
        await this.bot?.sendMessage(msg.chat.id, MESSAGE_TEMPLATES.ERROR_MESSAGE());
      }
    }
  }

  /**
   * Handle /reflink command
   */
  private async handleRefLinkCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      // Only handle private chats
      if (msg.chat.type !== 'private') {
        return;
      }

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      if (!userId) {
        await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.ERROR_MESSAGE());
        return;
      }

      const user = await User.findOne({ userId });

      if (!user) {
        await this.bot?.sendMessage(chatId, MESSAGE_TEMPLATES.USER_NOT_FOUND(), {
          reply_markup: this.getStartKeyboard()
        });
        return;
      }

      const referralBonus = this.botConfig?.referralBonus || 10;
      const message = MESSAGE_TEMPLATES.REFERRAL_INFO(
        user.referralCode,
        user.referralCount,
        referralBonus
      );

      await this.bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Copy Referral Link',
                callback_data: `copy_reflink_${user.referralCode}`
              }
            ],
            [
              {
                text: '📱 Open Mini App',
                web_app: { url: 'https://buyer-40.vercel.app' }
              }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleRefLinkCommand:', error);
      if (msg.chat?.id && msg.chat.type === 'private') {
        await this.bot?.sendMessage(msg.chat.id, MESSAGE_TEMPLATES.ERROR_MESSAGE());
      }
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Only handle private chats
      if (msg.chat.type !== 'private') {
        return;
      }

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      const referralBonus = this.botConfig?.referralBonus || 10;
      const message = MESSAGE_TEMPLATES.HELP_MESSAGE(referralBonus);

      await this.bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainKeyboard()
      });
    } catch (error) {
      console.error('Error in handleHelpCommand:', error);
      if (msg.chat?.id && msg.chat.type === 'private') {
        await this.bot?.sendMessage(msg.chat.id, MESSAGE_TEMPLATES.ERROR_MESSAGE());
      }
    }
  }

  /**
   * Handle default messages (non-commands)
   */
  private async handleDefaultMessage(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;


      // Only handle private chats
      if (msg.chat.type !== 'private') {
        console.log(`Ignoring message from ${msg.chat.type} chat: ${chatId}`);
        return;
      }

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      // Handle keyboard button presses
      /*  if (msg.text) {
         switch (msg.text) {
           case '💰 Balance':
             await this.handleBalanceCommand(msg);
             return;
           case '🔗 Referral Link':
             await this.handleRefLinkCommand(msg);
             return;
           case '❓ Help':
             await this.handleHelpCommand(msg);
             return;
           case '📱 Open Mini App':
             const miniAppUrl = 'https://earnfromadsbd.online';
             await this.bot?.sendMessage(chatId, `🚀 *Open Mini App*\n\n[Click here to open the EarnFrom Mini App](${miniAppUrl})`, {
               parse_mode: 'Markdown',
               reply_markup: {
                 inline_keyboard: [[
                   {
                     text: '📱 Open Mini App',
                     web_app: { url :  'https://earnfromadsbd.online' }
                   }
                 ]]
               }
             });
             return;
         }
       } */

      const fullName = `${msg.chat.first_name ?? ""} ${msg.chat.last_name ?? ""}`.trim();

      const message = `
✅ *Welcome ${fullName}* ▪️ 🎖️

Click the *"Start Earning"* button below to open the Web Mini App and start earning.  
👉 Click the button below to start now.  

📺 Watch the tutorial video for better understanding.  
`;

      await this.bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Start Earning", web_app: { url: "https://buyer-40.vercel.app" } }
            ],
           /*  [
              { text: "🎥 Tutorial Video", url: "https://youtu.be/WfZ2mvsOXAo?si=r5yRIqLyI9NbfQah" }
            ] */
          ]
        }
      });


    } catch (error) {
      console.error('Error in handleDefaultMessage:', error);
      if (msg.chat?.id && msg.chat.type === 'private') {
        await this.bot?.sendMessage(msg.chat.id, MESSAGE_TEMPLATES.ERROR_MESSAGE());
      }
    }
  }


  /**
   * Handle callback queries from inline keyboards
   */
  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data;

      if (!chatId || !data) return;

      // Check if bot is offline
      if (!(await this.checkBotStatus(chatId))) {
        return;
      }

      // Answer the callback query to remove loading state
      await this.bot?.answerCallbackQuery(callbackQuery.id);

      if (data.startsWith('copy_reflink_')) {
        const referralCode = data.replace('copy_reflink_', '');
        const botUsername = this.botConfig?.botUsername || 'earnfrom_bot';
        const referralLink = `https://t.me/${botUsername}?startapp=${referralCode}`;

        await this.bot?.sendMessage(chatId, `🔗 Your referral link:\n\`${referralLink}\`\n\n📋 Tap to copy and share with friends!`, {
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Error in handleCallbackQuery:', error);
    }
  }




  /**
   * Get main keyboard markup
   */
  private getMainKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: '💰 Balance' },
          { text: '🔗 Referral Link' }
        ],
        [
          { text: '📱 Open Mini App' },
          { text: '❓ Help' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };
  }

  /**
   * Get start keyboard markup for unregistered users
   */
  private getStartKeyboard(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: '🚀 Start Registration',
            callback_data: 'start_registration'
          }
        ],
        [
          {
            text: '📱 Open Mini App',
            web_app: { url: 'https://buyer-40.vercel.app' }
          }
        ]
      ]
    };
  }

  /**
   * Send a message to a specific user
   */
  public async sendMessageToUser(userId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Bot is not initialized');
        return false;
      }

      // Check if bot is offline
      if (this.botConfig?.botStatus === 'offline') {
        console.log('Bot is offline - cannot send message');
        return false;
      }

      await this.bot.sendMessage(userId, message, options);
      return true;
    } catch (error) {
      console.error(`Failed to send message to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send welcome message to a new user
   */
  public async sendWelcomeMessage(userId: number, firstName: string, balance: number, referralCode: string): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Bot is not initialized');
        return false;
      }

      // Check if bot is offline
      if (this.botConfig?.botStatus === 'offline') {
        console.log('Bot is offline - cannot send welcome message');
        return false;
      }

      const message = MESSAGE_TEMPLATES.WELCOME_NEW_USER(firstName, balance, referralCode);
      await this.bot.sendMessage(userId, message, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainKeyboard()
      });
      return true;
    } catch (error) {
      console.error(`Failed to send welcome message to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send web app welcome message when user allows bot to message them
   */
  public async sendWebAppWelcome(userId: number, firstName: string): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Bot is not initialized');
        return false;
      }

      // Check if bot is offline
      if (this.botConfig?.botStatus === 'offline') {
        console.log('Bot is offline - cannot send web app welcome message');
        return false;
      }

      const message = MESSAGE_TEMPLATES.WEB_APP_WELCOME(firstName);
      await this.bot.sendMessage(userId, message, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainKeyboard()
      });
      return true;
    } catch (error) {
      console.error(`Failed to send web app welcome message to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get bot instance for external use
   */
  public getBot(): TelegramBot | null {
    return this.bot;
  }

  /**
   * Stop the bot
   */
  public async stop(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stopPolling();
        console.log('🤖 Telegram Bot Service stopped');
      }
    } catch (error) {
      console.error('Error stopping Telegram Bot Service:', error);
    }
  }
}

// Export singleton instance
export const telegramBotService = new TelegramBotService();
export default telegramBotService;

