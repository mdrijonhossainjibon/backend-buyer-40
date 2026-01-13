import { Router, Request, Response } from 'express';
import firebaseService from 'services/firebaseService';

const router = Router();

/**
 * @route POST /api/firebase/send-notification
 * @desc Send notification to a single device
 */
router.post('/send-notification', async (req: Request, res: Response) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: token, title, body',
      });
    }

    const response = await firebaseService.sendToDevice(token, title, body, data);
 
    return res.json({
      success: true,
      message: 'Notification sent successfully',
      data: { messageId: response },
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/firebase/send-multicast
 * @desc Send notification to multiple devices
 */
router.post('/send-multicast', async (req: Request, res: Response) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tokens must be a non-empty array',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, body',
      });
    }

    const response = await firebaseService.sendToMultipleDevices(tokens, title, body, data);

    return res.json({
      success: true,
      message: 'Multicast notification sent',
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      },
    });
  } catch (error: any) {
    console.error('Error sending multicast notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send multicast notification',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/firebase/send-to-topic
 * @desc Send notification to a topic
 */
router.post('/send-to-topic', async (req: Request, res: Response) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: topic, title, body',
      });
    }

    const response = await firebaseService.sendToTopic(topic, title, body, data);

    return res.json({
      success: true,
      message: 'Notification sent to topic successfully',
      data: { messageId: response },
    });
  } catch (error: any) {
    console.error('Error sending notification to topic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification to topic',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/firebase/subscribe-to-topic
 * @desc Subscribe device tokens to a topic
 */
router.post('/subscribe-to-topic', async (req: Request, res: Response) => {
  try {
    const { tokens, topic } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tokens must be a non-empty array',
      });
    }

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: topic',
      });
    }

    const response = await firebaseService.subscribeToTopic(tokens, topic);

    return res.json({
      success: true,
      message: 'Subscribed to topic successfully',
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
    });
  } catch (error: any) {
    console.error('Error subscribing to topic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to topic',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/firebase/unsubscribe-from-topic
 * @desc Unsubscribe device tokens from a topic
 */
router.post('/unsubscribe-from-topic', async (req: Request, res: Response) => {
  try {
    const { tokens, topic } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tokens must be a non-empty array',
      });
    }

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: topic',
      });
    }

    const response = await firebaseService.unsubscribeFromTopic(tokens, topic);

    return res.json({
      success: true,
      message: 'Unsubscribed from topic successfully',
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
    });
  } catch (error: any) {
    console.error('Error unsubscribing from topic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from topic',
      error: error.message,
    });
  }
});

export default router;
