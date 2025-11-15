import { Activity, AdsSettings, User, Wallet } from 'models';
import { Server as SocketIOServer, Socket } from 'socket.io';

interface AuthUserData {
  telegramId: string;
  username?: string;
  telegramUsername?: string;
  profilePicUrl?: string;
  start_param?: string;
}

export class UsersController {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.initializeSocketEvents();
  }

  /** ✅ Initialize Socket.IO event listeners */
  private initializeSocketEvents() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('auth:user', (data) => {
        this.handleAuthUser(socket, data);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  /** ✅ Handles user authentication and referral logic */
  private async handleAuthUser(socket: Socket, rawData: any): Promise<void> {
    try {
      const data: AuthUserData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      const { telegramId, username, telegramUsername, profilePicUrl, start_param } = data;

      if (!telegramId) {
        socket.emit('auth:error', {
          success: false,
          message: 'Missing telegramId in request data.',
        });
        return;
      }

      console.log(start_param)

      console.log(await User.findOne({ referralCode : start_param }))

      // 🔹 Find or create user
      let user = await User.findOne({ userId: telegramId });
      if (!user) {
        let referrer: any = null;
        // 🔹 Try to find a referrer if start_param exists

        if (start_param) {
          console.log('Referral code:', start_param);
          try {
            referrer = await User.findOne({ referralCode: start_param });

            if (referrer) {
              const referrerBonus = 100;

              // ✅ Create user with referrer
              user = await User.create({
                userId: telegramId,
                username,
                telegramUsername,
                profilePicUrl,
                referredBy: referrer.userId,
              });

              // ✅ Update referrer's wallet balance
              await Wallet.findOneAndUpdate(
                { userId: referrer.userId },
                {
                  $inc: {
                    'balances.xp': referrerBonus,
                    'totalEarned.xp': referrerBonus,
                  },
                  lastTransaction: new Date(),
                },
                { upsert: true, new: true }
              );

              // ✅ Update referrer's referral count
              await User.findOneAndUpdate(
                { userId: referrer.userId },
                { $inc: { referralCount: 1 } },
                { new: true }
              );

              console.log(`Referral bonus ${referrerBonus} XP added to ${referrer.username}`);
            }
          } catch (referralErr) {
            console.error('Referral processing error:', referralErr);
          }
        }

      }


      if (!user) {
        user = await User.create({
          userId: telegramId,
          username,
          telegramUsername,
          profilePicUrl,
        });
        console.log('New user created without referrer');
      }
      // 🔹 Check or create wallet
      let wallet = await Wallet.findOne({ userId: user.userId });
      if (!wallet) {
        wallet = await Wallet.create({ userId: user.userId });
      }

      // 🔹 Get latest AdsSettings
      const adsConfig = await AdsSettings.findOne().sort({ createdAt: -1 });
      if (!adsConfig) {
        socket.emit('auth:error', {
          success: false,
          message: 'AdsSettings configuration not found.',
        });
        return;
      }

      // 🔹 Count today’s completed ad watches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAdWatchCount = await Activity.countDocuments({
        userId: user.userId,
        activityType: 'ad_watch',
        status: 'completed',
        createdAt: { $gte: today, $lt: tomorrow },
      });

      // 🔹 Send success response
      socket.emit('auth:response', {
        success: true,
        message: 'User authenticated successfully.',
        user: {
          userId: user.userId,
          username: user.username,
          telegramUsername: user.telegramUsername,
          profilePicUrl: user.profilePicUrl,
          referralCode: user.referralCode,
          referralCount: user.referralCount,
          status: user.status,
          watchedToday: todayAdWatchCount,
          wallet,
        },
      });
    } catch (err: any) {
      socket.emit('auth:error', {
        success: false,
        message: 'Authentication failed.',
        error: err?.message || 'Unknown error',
      });
    }
  }
}
