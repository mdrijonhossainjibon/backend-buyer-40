import { Router, Request, Response } from 'express';
import User from 'models/User';
import Withdrawal from 'models/Withdrawal';

const router = Router();

// GET /api/v1/admin/stats - Get comprehensive user statistics
router.get('/', async (req: Request, res: Response) => {
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
    
    // Get total withdrawals (completed)
    const totalWithdrawalsResult = await Withdrawal.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: '$amount' },
          withdrawalCount: { $sum: 1 }
        }
      }
    ]);
    const totalWithdrawn = totalWithdrawalsResult[0]?.totalWithdrawn || 0;
    const withdrawalCount = totalWithdrawalsResult[0]?.withdrawalCount || 0;
    
    // Get pending withdrawals
    const pendingWithdrawalsResult = await Withdrawal.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: '$amount' },
          pendingCount: { $sum: 1 }
        }
      }
    ]);
    const pendingWithdrawals = pendingWithdrawalsResult[0]?.pendingAmount || 0;
    const pendingWithdrawalsCount = pendingWithdrawalsResult[0]?.pendingCount || 0;
    
    // Get current total balance across all users
    const totalBalanceResult = await User.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balanceTK' }
        }
      }
    ]);
    const totalBalance = totalBalanceResult[0]?.totalBalance || 0;
    
    // Get users registered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const usersToday = await User.countDocuments({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Get users registered this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const usersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: startOfMonth
      }
    });
    
    // Get referral statistics
    const referralStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: '$referralCount' },
          usersWithReferrals: {
            $sum: {
              $cond: [{ $gt: ['$referralCount', 0] }, 1, 0]
            }
          }
        }
      }
    ]);
    const totalReferrals = referralStats[0]?.totalReferrals || 0;
    const usersWithReferrals = referralStats[0]?.usersWithReferrals || 0;
    
    // Response object with all statistics
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        registeredToday: usersToday,
        registeredThisMonth: usersThisMonth,
        withReferrals: usersWithReferrals
      },
      earnings: {
        totalEarned: totalEarnings,
        currentBalance: totalBalance,
        averageEarningsPerUser: totalUsers > 0 ? Math.round((totalEarnings / totalUsers) * 100) / 100 : 0
      },
      withdrawals: {
        totalWithdrawn: totalWithdrawn,
        withdrawalCount: withdrawalCount,
        pendingAmount: pendingWithdrawals,
        pendingCount: pendingWithdrawalsCount,
        averageWithdrawal: withdrawalCount > 0 ? Math.round((totalWithdrawn / withdrawalCount) * 100) / 100 : 0
      },
      referrals: {
        totalReferrals: totalReferrals,
        averageReferralsPerUser: totalUsers > 0 ? Math.round((totalReferrals / totalUsers) * 100) / 100 : 0
      },
      summary: {
        platformBalance: totalBalance,
        totalPlatformValue: totalEarnings,
        withdrawalRate: totalEarnings > 0 ? Math.round((totalWithdrawn / totalEarnings) * 10000) / 100 : 0, // Percentage
        userGrowthRate: usersThisMonth > 0 && totalUsers > usersThisMonth ? 
          Math.round(((usersThisMonth / (totalUsers - usersThisMonth)) * 100) * 100) / 100 : 0
      }
    };
    
    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
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
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balanceTK' },
          totalEarned: { $sum: '$totalEarned' },
          totalWithdrawn: { $sum: '$withdrawnAmount' },
          avgBalance: { $avg: '$balanceTK' },
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

export default router;