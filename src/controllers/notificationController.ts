import { Request, Response } from 'express';
import { Admin} from 'models';
 
/**
 * Register or update FCM token for an admin
 * POST /api/v1/notifications/register-fcm
 */
export const registerFCMToken = async (req: Request, res: Response) => {
  try {
    const { fcmToken, userId } = req.body;

    // Validate input
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }
 
    // Find and update admin with FCM token
    const admin = await Admin.findOneAndUpdate(
      { _id: userId },
      { 
        fcmToken: fcmToken,
        lastTokenUpdate: new Date()
      },
      { new: true, upsert: false }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
 

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        userId: admin._id,
        username: admin.username,
        tokenRegistered: true,
        lastTokenUpdate: admin.lastTokenUpdate
      }
    });

  } catch (error: any) {
    console.error('FCM token registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register FCM token'
    });
  }
};

/**
 * Update FCM token for an admin (when token refreshes)
 * PUT /api/v1/notifications/update-fcm
 */
export const updateFCMToken = async (req: Request, res: Response) => {
  try {
    const { oldToken, newToken, userId } = req.body;

    // Validate input
    if (!newToken) {
      return res.status(400).json({
        success: false,
        message: 'New FCM token is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    // Find admin by old token or userId
    let query: any = { _id: userId };
    
    // If oldToken is provided, verify it matches
    if (oldToken) {
      const adminWithOldToken = await Admin.findOne({ 
        _id: userId, 
        fcmToken: oldToken 
      });
      
      if (!adminWithOldToken) {
        console.warn(`Old token mismatch for admin ${userId}`);
      }
    }

    // Update admin with new FCM token
    const admin = await Admin.findOneAndUpdate(
      query,
      { 
        fcmToken: newToken,
        lastTokenUpdate: new Date()
      },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        userId: admin._id,
        username: admin.username,
        tokenUpdated: true,
        lastTokenUpdate: admin.lastTokenUpdate
      }
    });

  } catch (error: any) {
    console.error('FCM token update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update FCM token'
    });
  }
};

/**
 * Get FCM token for an admin
 * GET /api/v1/notifications/fcm-token/:userId
 */
export const getFCMToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    const admin = await Admin.findById(userId)
      .select('_id username fcmToken lastTokenUpdate');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: admin._id,
        username: admin.username,
        fcmToken: admin.fcmToken || null,
        lastTokenUpdate: admin.lastTokenUpdate || null,
        hasToken: !!admin.fcmToken
      }
    });

  } catch (error: any) {
    console.error('Get FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get FCM token'
    });
  }
};

/**
 * Delete FCM token for an admin (logout/unregister)
 * DELETE /api/v1/notifications/fcm-token/:userId
 */
export const deleteFCMToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      userId,
      { 
        $unset: { fcmToken: 1 },
        lastTokenUpdate: new Date()
      },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token deleted successfully',
      data: {
        userId: admin._id,
        username: admin.username,
        tokenDeleted: true
      }
    });

  } catch (error: any) {
    console.error('Delete FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete FCM token'
    });
  }
};


