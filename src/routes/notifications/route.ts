import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import Notification from '@/models/Notification'
import User from '@/models/User'

 
const router = Router();

router.post('/notifications', async (req: Request, res: Response) => {
    try {
        const { timestamp, signature, hash } = req.body;

        const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

        const result = verifySignature({ timestamp, signature, hash }, secretKey);
        if (!result.success) {
            return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
        }

        const { userId, action = 'list', notificationIds } = JSON.parse(result.data as string);

        // Find user
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                success: false, 
                message: 'User not found'
            });
        }

        // Check if user is suspended
        if (user.status === 'suspend') {
            return res.status(403).json({
                success: false, 
                message: 'Your account has been suspended!'
            });
        }

        switch (action) {
            case 'list':
                const notifications = await Notification.find({ userId })
                return res.json({
                    success: true,
                    data: {
                        notifications: notifications.map(notification => ({
                            id: notification._id,
                            title: notification.title,
                            description: notification.description,
                            type: notification.type,
                            isRead: notification.isRead,
                            priority: notification.priority,
                            timeAgo: getTimeAgo(notification.createdAt),
                            metadata: notification.metadata,
                            message: notification.message,
                            createdAt: notification.createdAt
                        }))
                    }
                })

            case 'markRead':
                if (!notificationIds || notificationIds.length === 0) {
                    return res.status(400).json({
                        success: false, 
                        message: 'Notification IDs are required'
                    });
                }

                await Notification.updateMany({ userId, _id: { $in: notificationIds } }, { isRead: true })
                return res.json({
                    success: true,
                    message: 'Notifications marked as read'
                })

            case 'unreadCount':
                const unreadCount = await Notification.countDocuments({ userId, isRead: false })
                return res.json({
                    success: true,
                    data: { unreadCount }
                })

            default:
                return res.status(400).json({
                    success: false, 
                    message: 'Invalid action'
                });
        }

    } catch (error) {
        console.error('Notifications API error:', error);
        return res.status(500).json({
            success: false, 
            message: 'Internal server error'
        });
    }
});

export default router;

// Helper function to calculate time ago in Bengali
function getTimeAgo(createdAt: Date): string {
    const now = new Date()
    const diff = now.getTime() - createdAt.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
        return `${minutes} মিনিট আগে`
    } else if (hours < 24) {
        return `${hours} ঘন্টা আগে`
    } else {
        return `${days} দিন আগে`
    }
}
