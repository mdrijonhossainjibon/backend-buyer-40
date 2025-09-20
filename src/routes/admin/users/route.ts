import { Router, Request, Response } from 'express'
import User from '@/models/User'
import Withdrawal from '@/models/Withdrawal';
import { formatNumber } from '@/lib/formatNumber';

const router = Router()

// GET route for fetching users with query parameters
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'all'
    const search = req.query.search as string || ''
    const limit = parseInt(req.query.limit as string || '500')
    const offset = parseInt(req.query.offset as string || '0')

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

router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, status, search, limit = 500, offset = 0 } = req.body

    if (action === 'list-users') {
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
    }

    if (action === 'get-user-stats') {
      const totalUsers = await User.countDocuments({})
      const activeUsers = await User.countDocuments({ status: 'active' })
      
      // Aggregate total earnings from User model
      const earningsResult = await User.aggregate([
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$balanceTK' }
          }
        }
      ])

      // Aggregate total withdrawals from Withdrawal model
      const withdrawalsResult = await Withdrawal.aggregate([
        {
          $match: { status: 'approved' }
        },
        {
          $group: {
            _id: null,
            totalWithdrawals: { $sum: '$amount' }
          }
        }
      ])

      const totalEarnings = earningsResult[0]?.totalEarnings || 0
      const totalWithdrawals = withdrawalsResult[0]?.totalWithdrawals || 0

      return res.json({
        success: true,
        data: {
          totalUsers: formatNumber(totalUsers),
          activeUsers: formatNumber(activeUsers),
          totalEarnings: formatNumber(totalEarnings),
          totalWithdrawals: formatNumber(totalWithdrawals),
          averageEarningsPerUser: formatNumber(totalUsers > 0 ? totalEarnings / totalUsers : 0)
        }
      })
    }

    if (action === 'update-user-status') {
      const { userId, newStatus } = req.body
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { status: newStatus, updatedAt: new Date() },
        { new: true }
      )

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      return res.json({
        success: true,
        message: `User status updated to ${newStatus}`,
        data: { userId, newStatus }
      })
    }

    if (action === 'update-user-balance') {
      const { userId, newBalance } = req.body
      
      if (typeof newBalance !== 'number' || newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid balance amount'
        })
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { balanceTK : newBalance, updatedAt: new Date() },
        { new: true }
      )

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      return res.json({
        success: true,
        message: `User balance updated to ৳${newBalance}`,
        data: { userId, newBalance }
      })
    }

    if (action === 'get-user-details') {
      const { userId } = req.body
      
      const user = await User.findById(userId); 
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      // Calculate additional stats
      const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))

      return res.json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            phone: user.phone,
            status: user.status || 'active',
            joinDate: user.createdAt,
            lastActive: user.lastActive || user.createdAt,
            totalEarnings: formatNumber(user.totalEarnings || 0),
            totalWithdrawals: formatNumber(user.totalWithdrawals || 0),
            referralCount: user.referralCount || 0
          },
          additionalStats: {
            tasksCompleted: formatNumber(user.tasksCompleted || 0),
            withdrawalRequests: formatNumber(user.withdrawalRequests || 0),
            accountAge
          }
        }
      })
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    })

  } catch (error) {
    console.error('Admin users API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
