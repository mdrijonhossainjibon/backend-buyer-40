import { Router, Request, Response } from 'express';
import User from 'models/User';
import Wallet from 'models/Wallet';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     description: Retrieve list of all users with optional filtering by status
 *     tags: [Admin Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspend]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, userId, or referralCode
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchStr = (search as string).toLowerCase();
      query.$or = [
        { username: { $regex: searchStr, $options: 'i' } },
        { userId: isNaN(Number(searchStr)) ? undefined : Number(searchStr) },
        { referralCode: { $regex: searchStr, $options: 'i' } },
      ].filter(item => Object.values(item)[0] !== undefined);
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get users
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

   

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

 

/**
 * @swagger
 * /api/v1/admin/users/{userId}/status:
 *   put:
 *     summary: Update user status
 *     description: Change user status (active/suspend)
 *     tags: [Admin Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspend]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspend'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be either "active" or "suspend"',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    )
     

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

 

/**
 * @swagger
 * /api/v1/admin/users/stats/summary:
 *   get:
 *     summary: Get users statistics
 *     description: Get summary statistics about users
 *     tags: [Admin Users]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspend' });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        inactiveUsers: totalUsers - activeUsers - suspendedUsers,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
