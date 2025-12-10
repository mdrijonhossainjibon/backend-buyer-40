import { Router } from 'express';
import {
  registerFCMToken,
  updateFCMToken,
  getFCMToken,
  deleteFCMToken
} from '../../controllers/notificationController';

const router = Router();

/**
 * @swagger
 * /api/v1/notifications/register-fcm:
 *   post:
 *     summary: Register FCM token for push notifications
 *     description: Register or update FCM token for a user to enable push notifications
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *               - userId
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *                 example: "dXZw1234abcd..."
 *               userId:
 *                 type: number
 *                 description: Telegram user ID
 *                 example: 123456789
 *     responses:
 *       200:
 *         description: FCM token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FCM token registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: number
 *                     tokenRegistered:
 *                       type: boolean
 *                     lastTokenUpdate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/notifications/register-fcm', registerFCMToken);

/**
 * @swagger
 * /api/v1/notifications/update-fcm:
 *   put:
 *     summary: Update FCM token (on token refresh)
 *     description: Update FCM token when Firebase refreshes the token
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newToken
 *               - userId
 *             properties:
 *               oldToken:
 *                 type: string
 *                 description: Previous FCM token (optional)
 *                 example: "oldToken123..."
 *               newToken:
 *                 type: string
 *                 description: New FCM token
 *                 example: "newToken456..."
 *               userId:
 *                 type: number
 *                 description: Telegram user ID
 *                 example: 123456789
 *     responses:
 *       200:
 *         description: FCM token updated successfully
 *       400:
 *         description: Bad request - missing required fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/notifications/update-fcm', updateFCMToken);

/**
 * @swagger
 * /api/v1/notifications/fcm-token/{userId}:
 *   get:
 *     summary: Get FCM token for a user
 *     description: Retrieve the FCM token for a specific user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: number
 *         description: Telegram user ID
 *     responses:
 *       200:
 *         description: FCM token retrieved successfully
 *       400:
 *         description: Bad request - missing userId
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/notifications/fcm-token/:userId', getFCMToken);

/**
 * @swagger
 * /api/v1/notifications/fcm-token/{userId}:
 *   delete:
 *     summary: Delete FCM token (logout/unregister)
 *     description: Remove FCM token for a user when they logout or unregister
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: number
 *         description: Telegram user ID
 *     responses:
 *       200:
 *         description: FCM token deleted successfully
 *       400:
 *         description: Bad request - missing userId
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/notifications/fcm-token/:userId', deleteFCMToken);

export default router;
