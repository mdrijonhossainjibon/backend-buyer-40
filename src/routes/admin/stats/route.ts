import { Router, Request, Response } from 'express';
import User from 'models/User';
import Withdrawal from 'models/Withdrawal';
import { Activity, Wallet } from 'models';
import dayjs from 'dayjs'
const router = Router();

// GET /api/v1/admin/stats - Get comprehensive user statistics (Admin Panel Format)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
     const sinces = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
     const active = await Activity.distinct("userId", {
    createdAt: { $gte: sinces }
  })

    // Get suspended users count
    const suspend = await User.countDocuments({ status: 'suspend' });
    
    // Get pending users count
    const pending = await Withdrawal.countDocuments({ status: 'pending' });
    
    // Get total watched ads count (assuming you have an ads collection or field)
    // Replace with your actual ads tracking logic
    const totalWatchedAds = await Activity.countDocuments({ activityType : 'ad_watch' })
    
 
    
   const since = dayjs().subtract(24, 'hour').toDate();
  
   const ads24h = await Activity.countDocuments({
    activityType: 'ad_watch',
    status: 'completed',
    createdAt: { $gte: since }
  })
    
    // Admin Panel compatible response format
    const adminStats = {
      totalUsers,
      totalWatchedAds,
      pending,
      suspend,
      activeToday : active.length,
      ads24h
    };
    
    res.json({
      success: true,
      message: 'Admin statistics retrieved successfully',
      data: adminStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/admin/stats/detailed - Get more detailed statistics with breakdowns
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    // User status breakdown with additional metrics
    const userStatusBreakdown = await User.aggregate([
      {
        $lookup: {
          from: 'wallets',
          localField: 'userId',
          foreignField: 'userId',
          as: 'wallet' 
        }
      },
      {
        $unwind: {
          path: '$wallet',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalanceXP: { $sum: { $ifNull: ['$wallet.balances.xp', 0] } },
          totalBalanceUSDT: { $sum: { $ifNull: ['$wallet.balances.usdt', 0] } },
          totalBalanceSPIN: { $sum: { $ifNull: ['$wallet.balances.spin', 0] } },
          totalEarned: { $sum: '$totalEarned' },
          totalWithdrawn: { $sum: '$withdrawnAmount' },
          avgBalanceXP: { $avg: { $ifNull: ['$wallet.balances.xp', 0] } },
          avgBalanceUSDT: { $avg: { $ifNull: ['$wallet.balances.usdt', 0] } },
          avgBalanceSPIN: { $avg: { $ifNull: ['$wallet.balances.spin', 0] } },
          avgEarned: { $avg: '$totalEarned' }
        }
      }
    ]);
    
    // Monthly registration trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Top referrers
    const topReferrers = await User.find({ referralCount: { $gt: 0 } })
      .select('userId username referralCode referralCount totalEarned')
      .sort({ referralCount: -1 })
      .limit(10);
    
    // Withdrawal method breakdown
    const withdrawalMethodBreakdown = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    // Withdrawal status breakdown
    const withdrawalStatusBreakdown = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      message: 'Detailed statistics retrieved successfully',
      data: {
        userStatusBreakdown,
        monthlyRegistrations,
        topReferrers,
        withdrawalMethodBreakdown,
        withdrawalStatusBreakdown
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching detailed statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/admin/stats/legacy - Legacy format for backward compatibility
router.get('/legacy', async (req: Request, res: Response) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active users count
    const activeUsers = await User.countDocuments({ status: 'active' });
    
    // Get suspended users count
    const suspendedUsers = await User.countDocuments({ status: 'suspend' });
    
    // Get total earnings across all users
    const totalEarningsResult = await User.aggregate([
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$totalEarned' }
        }
      }
    ]);
    const totalEarnings = totalEarningsResult[0]?.totalEarned || 0;
    
    // Get withdrawal statistics by status
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Process withdrawal stats
    const withdrawalData = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      pendingAmount: 0
    };
    
    withdrawalStats.forEach(stat => {
      withdrawalData.total += stat.count;
      withdrawalData.totalAmount += stat.totalAmount;
      
      if (stat._id === 'pending') {
        withdrawalData.pending = stat.count;
        withdrawalData.pendingAmount = stat.totalAmount;
      } else if (stat._id === 'approved') {
        withdrawalData.approved = stat.count;
      } else if (stat._id === 'rejected') {
        withdrawalData.rejected = stat.count;
      }
    });
    
    // Legacy response format
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers
      },
      earnings: {
        totalEarned: totalEarnings
      },
      withdrawals: {
        total: withdrawalData.total,
        pending: withdrawalData.pending,
        approved: withdrawalData.approved,
        rejected: withdrawalData.rejected,
        totalAmount: withdrawalData.totalAmount,
        pendingAmount: withdrawalData.pendingAmount
      }
    };
    
    res.json({
      success: true,
      message: 'Legacy user statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching legacy statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch legacy statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;