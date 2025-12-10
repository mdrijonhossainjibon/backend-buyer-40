import * as cron from 'node-cron';
import User from '../models/User';
import telegramBotService from '../services/telegram';

/**
 * Cron job to check for inactive users and send reminders
 * Runs every hour to check users who have been offline for 3 hours
 */
export class UserActivityReminderJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   * Runs every hour at minute 0
   */
  start() {
    // Run every hour (at minute 0)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('🔔 Running user activity reminder job...');
      await this.checkInactiveUsers();
    });

    console.log('✅ User activity reminder job started (runs every hour)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 User activity reminder job stopped');
    }
  }

  /**
   * Check for users who have been offline for 3 hours
   */
  private async checkInactiveUsers() {
    try {
      // Calculate 3 hours ago
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      // Find users who:
      // 1. Last login was more than 3 hours ago
      // 2. Are active (not suspended)
      // 3. Have notifications enabled
      const inactiveUsers = await User.find({
        lastLogin: { $lt: threeHoursAgo },
        status: 'active',
        'settings.notifications': true,
      }).select('userId username profile.firstName lastLogin');

      console.log(`📊 Found ${inactiveUsers.length} inactive users (offline for 3+ hours)`);

      // Send reminder to each inactive user
      for (const user of inactiveUsers) {
        await this.sendReminder(user);
      }

      console.log(`✅ Sent ${inactiveUsers.length} reminder messages`);
    } catch (error: any) {
      console.error('❌ Error checking inactive users:', error.message);
    }
  }

  /**
   * Send reminder message to a user
   */
  private async sendReminder(user: any) {
    try {
      const firstName = user.profile?.firstName || user.username || 'User';
      const hoursOffline = Math.floor(
        (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60)
      );

      const message = `
👋 Hey ${firstName}!

We noticed you haven't been active for ${hoursOffline} hours. 

🎯 Don't miss out on:
• Daily rewards and bonuses
• New tasks and opportunities
• Referral earnings

Come back and continue earning! 💰

Tap here to get started: /start
      `.trim();

      await telegramBotService.sendMessageToUser(user.userId, message, {
        parse_mode: 'Markdown',
      });
      console.log(`✅ Reminder sent to user ${user.userId} (${firstName})`);
    } catch (error: any) {
      console.error(`❌ Failed to send reminder to user ${user.userId}:`, error.message);
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow() {
    console.log('🔔 Running user activity reminder job manually...');
    await this.checkInactiveUsers();
  }
}

// Export singleton instance
export const userActivityReminderJob = new UserActivityReminderJob();
