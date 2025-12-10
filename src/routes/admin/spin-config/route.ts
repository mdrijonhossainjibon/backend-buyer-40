import { Router, Request, Response } from 'express';
import SpinWheelConfig from 'models/SpinWheelConfig';
import SpinHistory from 'models/SpinHistory';
import SpinTicket from 'models/SpinTicket';

const router = Router();

// GET /api/v1/admin/spin-config - Get spin wheel configuration for admin
router.get('/', async (req: Request, res: Response) => {
  try {
    let config = await SpinWheelConfig.findOne({}).sort({ createdAt: -1 });

    // If no config exists, create default configuration
    if (!config) {
      config = await SpinWheelConfig.create({
        enabled: true,
        segments: [
          { id: '1', label: '10 XP', value: 10, probability: 30, color: '#10B981' },
          { id: '2', label: '25 XP', value: 25, probability: 25, color: '#3B82F6' },
          { id: '3', label: '50 XP', value: 50, probability: 20, color: '#8B5CF6' },
          { id: '4', label: '100 XP', value: 100, probability: 15, color: '#F59E0B' },
          { id: '5', label: '250 XP', value: 250, probability: 7, color: '#EF4444' },
          { id: '6', label: '1000 XP', value: 1000, probability: 2, color: '#FCD535' },
          { id: '7', label: 'Try Again', value: 0, probability: 1, color: '#6B7280' },
        ],
        maxSpinsPerDay: 10,
        maxFreeSpins: 4,
        maxExtraSpins: 6,
        spinCooldownMinutes: 60,
        ticketPrice: 100,
        minBalanceRequired: 0,
      });
    }

    // Get analytics
    const [totalSpins, rewardsGiven, activeUsersResult] = await Promise.all([
      SpinHistory.countDocuments({}),
      SpinHistory.aggregate([
        { $group: { _id: null, total: { $sum: '$winAmount' } } }
      ]),
      SpinTicket.distinct('userId', { totalSpins: { $gt: 0 } }),
    ]);

    const analytics = {
      totalSpins,
      rewardsGiven: rewardsGiven[0]?.total || 0,
      activeUsers: activeUsersResult.length,
    };

    return res.json({
      success: true,
      data: {
        config: {
          enabled: config.enabled,
          segments: config.segments,
          maxSpinsPerDay: config.maxSpinsPerDay,
          maxFreeSpins: config.maxFreeSpins,
          maxExtraSpins: config.maxExtraSpins,
          spinCooldownMinutes: config.spinCooldownMinutes,
          ticketPrice: config.ticketPrice,
          minBalanceRequired: config.minBalanceRequired,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        },
        analytics,
      },
    });
  } catch (error: any) {
    console.error('Admin Spin Config GET error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// PUT /api/v1/admin/spin-config - Update spin wheel configuration
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      enabled,
      segments,
      maxSpinsPerDay,
      maxFreeSpins,
      maxExtraSpins,
      spinCooldownMinutes,
      ticketPrice,
      minBalanceRequired,
    } = req.body;

    // Validate segments probability
    if (segments && Array.isArray(segments)) {
      const totalProbability = segments.reduce((sum: number, seg: any) => sum + (seg.probability || 0), 0);
      if (Math.abs(totalProbability - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total probability must equal 100%. Current total: ${totalProbability}%`,
        });
      }
    }

    let config = await SpinWheelConfig.findOne({}).sort({ createdAt: -1 });

    if (!config) {
      // Create new config
      config = await SpinWheelConfig.create({
        enabled: enabled ?? true,
        segments: segments || [],
        maxSpinsPerDay: maxSpinsPerDay || 10,
        maxFreeSpins: maxFreeSpins || 4,
        maxExtraSpins: maxExtraSpins || 6,
        spinCooldownMinutes: spinCooldownMinutes || 60,
        ticketPrice: ticketPrice || 100,
        minBalanceRequired: minBalanceRequired || 0,
      });
    } else {
      // Update existing config
      if (enabled !== undefined) config.enabled = enabled;
      if (segments) config.segments = segments;
      if (maxSpinsPerDay !== undefined) config.maxSpinsPerDay = maxSpinsPerDay;
      if (maxFreeSpins !== undefined) config.maxFreeSpins = maxFreeSpins;
      if (maxExtraSpins !== undefined) config.maxExtraSpins = maxExtraSpins;
      if (spinCooldownMinutes !== undefined) config.spinCooldownMinutes = spinCooldownMinutes;
      if (ticketPrice !== undefined) config.ticketPrice = ticketPrice;
      if (minBalanceRequired !== undefined) config.minBalanceRequired = minBalanceRequired;

      await config.save();
    }

    return res.json({
      success: true,
      message: 'Spin wheel configuration updated successfully',
      data: {
        enabled: config.enabled,
        segments: config.segments,
        maxSpinsPerDay: config.maxSpinsPerDay,
        maxFreeSpins: config.maxFreeSpins,
        maxExtraSpins: config.maxExtraSpins,
        spinCooldownMinutes: config.spinCooldownMinutes,
        ticketPrice: config.ticketPrice,
        minBalanceRequired: config.minBalanceRequired,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Admin Spin Config PUT error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// GET /api/v1/admin/spin-config/analytics - Get detailed spin analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    const matchStage = Object.keys(dateFilter).length > 0 
      ? { spinDate: dateFilter } 
      : {};

    const [
      totalSpins,
      totalRewards,
      spinsBySegment,
      dailySpins,
      activeUsers,
      topWinners,
    ] = await Promise.all([
      SpinHistory.countDocuments(matchStage),
      SpinHistory.aggregate([
        { $match: matchStage },
        { $group: { _id: null, total: { $sum: '$winAmount' } } }
      ]),
      SpinHistory.aggregate([
        { $match: matchStage },
        { $group: { 
          _id: '$segmentLabel', 
          count: { $sum: 1 },
          totalWon: { $sum: '$winAmount' }
        }},
        { $sort: { count: -1 } }
      ]),
      SpinHistory.aggregate([
        { $match: matchStage },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$spinDate' } },
          count: { $sum: 1 },
          totalWon: { $sum: '$winAmount' }
        }},
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      SpinTicket.countDocuments({ totalSpins: { $gt: 0 } }),
      SpinTicket.find({})
        .sort({ totalWinnings: -1 })
        .limit(10)
        .select('userId totalSpins totalWinnings')
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        totalSpins,
        totalRewards: totalRewards[0]?.total || 0,
        activeUsers,
        spinsBySegment,
        dailySpins,
        topWinners,
      },
    });
  } catch (error: any) {
    console.error('Admin Spin Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
