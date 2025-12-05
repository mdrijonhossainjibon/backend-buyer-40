import { Router, Request, Response } from 'express'
import User from 'models/User'
import Withdrawal from 'models/Withdrawal';
import { formatNumber } from 'lib/formatNumber';

const router = Router()

// GET route for fetching users with query parameters
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'all'
    const search = req.query.search as string || ''
    const limit = parseInt(req.query.limit as string || '10')
    const offset = parseInt(req.query.offset as string || '0')

    console.log(req.query)

    // Build query filter
    const query: any = {}
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status
    }

    // Filter by search query if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim()
      const searchConditions: any[] = []
      
      // Always search username with regex
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i')
        searchConditions.push({ username: searchRegex })
      }
      
      // Only search userId if the search term is a valid number
      if (!isNaN(Number(searchTerm)) && searchTerm !== '') {
        searchConditions.push({ userId: Number(searchTerm) })
      }
      
      if (searchConditions.length > 0) {
        query.$or = searchConditions
      }
    }

    // Get total count for pagination
    const total = await User.countDocuments(query)

    // Fetch users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()

    // Get withdrawal totals for all users
    const withdrawalTotals = await Withdrawal.aggregate([
      {
        $match: { status: 'approved' }
      },
      {
        $group: {
          _id: '$userId',
          totalWithdrawals: { $sum: '$amount' }
        }
      }
    ])

    // Create a map for quick lookup
    const withdrawalMap = new Map()
    withdrawalTotals.forEach(item => {
      withdrawalMap.set(item._id.toString(), item.totalWithdrawals)
    })

    // Transform data to match expected format
    const transformedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      status: user.status || 'active',
      joinDate: user.createdAt,
      lastActive: user.lastActive || user.createdAt,
      totalEarnings: formatNumber(user.balanceTK || 0),
      totalWithdrawals: formatNumber(withdrawalMap.get(user.userId.toString()) || 0),
      referralCount: user.referralCount || 0
    }))

    // Get stats for all users
    const allUsers = await User.find({}).select('status').lean()
    const stats = {
      total: allUsers.length,
      active: allUsers.filter(u => (u.status || 'active') === 'active').length,
      inactive: allUsers.filter(u => u.status === 'inactive').length,
      suspend: allUsers.filter(u => u.status === 'suspend').length
    }

    return res.json({
      success: true,
      data: {
        users: transformedUsers,
        total,
        hasMore: offset + limit < total,
        stats
      }
    })

  } catch (error) {
    console.error('Admin users GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})



// GET route for fetching a single user by ID
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Find user by either MongoDB _id or userId field
    let user: any = null
    
    // Try to find by MongoDB ObjectId first
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(userId).lean()
    }
    
    // If not found, try to find by userId (telegram ID)
    if (!user) {
      user = await User.findOne({ userId: Number(userId) }).lean()
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Get withdrawal total for this user
    const withdrawalTotal = await Withdrawal.aggregate([
      {
        $match: { 
          userId: user.userId,
          status: 'approved' 
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: '$amount' }
        }
      }
    ])

    // Get referral count
    const referralCount = await User.countDocuments({ referredBy: user.userId })

    // Transform data to match expected format
    const transformedUser = {
      id: user._id,
      username: user.username || `User${user.userId}`,
      userId: user.userId,
      telegramId: user.userId.toString(),
      status: user.status || 'active',
      joinDate: user.createdAt,
      lastActive: user.lastLogin || user.createdAt,
      totalEarnings: formatNumber((user as any).balanceTK || 0),
      totalWithdrawals: formatNumber(withdrawalTotal[0]?.totalWithdrawals || 0),
      referralCount: referralCount,
      referralCode: user.referralCode,
      referredBy: user.referredBy
    }

    return res.json({
      success: true,
      data: {
        user: transformedUser
      }
    })

  } catch (error) {
    console.error('Admin user GET by ID API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// PUT route for updating user status
router.put('/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { status } = req.body

    // Validate status
    const validStatuses = ['active', 'suspend']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, suspend'
      })
    }

    // Find and update user
    let user: { userId: number; status: string } | null = null
    
    // Try to find by MongoDB ObjectId first
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true }
      ).lean() as { userId: number; status: string } | null
    }
    
    // If not found, try to find by userId (telegram ID)
    if (!user) {
      user = await User.findOneAndUpdate(
        { userId: Number(userId) },
        { status },
        { new: true }
      ).lean() as { userId: number; status: string } | null
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    return res.json({
      success: true,
      data: {
        userId: user.userId,
        status: user.status
      }
    })

  } catch (error) {
    console.error('Admin user status update API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// DELETE route for deleting a user
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Find and delete user
    let user = null
    
    // Try to find by MongoDB ObjectId first
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findByIdAndDelete(userId).lean()
    }
    
    // If not found, try to find by userId (telegram ID)
    if (!user) {
      user = await User.findOneAndDelete({ userId: Number(userId) }).lean()
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    return res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId: (user as any).userId
      }
    })

  } catch (error) {
    console.error('Admin user delete API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
