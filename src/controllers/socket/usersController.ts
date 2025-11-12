import { Activity, AdsSettings, User, Wallet } from 'models';
import { Server as SocketIOServer, Socket } from 'socket.io';

export class UsersController {
    private io: SocketIOServer;

    constructor(io: SocketIOServer) {
        this.io = io;
        this.initializeSocketEvents();
    }

    private initializeSocketEvents() {
        this.io.on('connection', (socket: Socket) => {

            socket.on('auth:user', (data) => {
                this.handleAuthUser(socket, data);
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }

    private async handleAuthUser(socket: Socket, data: any) {
        const { telegramId, username, telegramUsername, profilePicUrl, start_param } = JSON.parse(data);
        let user = await User.findOne({ userId: telegramId });


        if (!user) {
            user = await User.create({ userId: telegramId, username, telegramUsername, profilePicUrl });
        }
        const wallet = await Wallet.findOne({ userId: user.userId });
        const AdsConfig = await AdsSettings.findOne().sort({ createdAt: -1 });

        if (!AdsConfig) {
            socket.emit('auth:errr', { success: false, message: 'AdsSettings configuration not found' });
            return;
        }
        // Check daily ad limit using activities and AdsSettings config
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayAdWatchCount = await Activity.countDocuments({
            userId: user.userId,
            activityType: 'ad_watch',
            status: 'completed',
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        })


        socket.emit('auth:response', {
            success: true, message: 'User authenticated', user: {
                userId: user.userId, referralCount: user.referralCount,
                watchedToday: todayAdWatchCount, username, status: user.status,
                referralCode: user.referralCode,
                wallet
            }
        });
    }
}
