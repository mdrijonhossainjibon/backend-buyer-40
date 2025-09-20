import { Router, Request, Response } from 'express'
import Activity from 'models/Activity'
import User from 'models/User'

const router = Router()

// Utility function to format numbers (1k, 2.5k, etc.)

router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, search, status, activityType, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.body

    if (action === 'list-activities') {
      // Build query filter
      const query: any = {}
      
      // Filter by status if provided
      if (status && status !== 'all') {
        query.status = status
      }

      // Filter by activity type if provided
      if (activityType && activityType !== 'all') {
        query.activityType = activityType
      }

      // Filter by search query if provided
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i')
        query.$or = [
          { description: searchRegex },
          { activityType: searchRegex },
          { userId: isNaN(Number(search)) ? undefined : Number(search) }
        ].filter(Boolean)
      }

      // Get total count for pagination
      const total = await Activity.countDocuments(query)

      // Build sort object
      const sortObj: any = {}
      sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1

      // Fetch activities with pagination
      const activities = await Activity.find(query)
        .sort(sortObj)
        .skip(offset)
        .limit(limit)
        .lean()

      // Get user information for activities
      const userIds = [...new Set(activities.map(activity => activity.userId))]
      const users = await User.find({ userId: { $in: userIds } }).select('userId username email').lean()
      const userMap = new Map(users.map(user => [user.userId, user]))

      // Transform data to include user information
      const transformedActivities = activities.map(activity => ({
        ...activity,
        _id: activity._id,
        user: userMap.get(activity.userId) || null
      }))

      // Get stats for all activities
      const stats = await Activity.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])

      const statsObj = {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        totalAmount: 0
      }

      stats.forEach(stat => {
        statsObj[stat._id as keyof typeof statsObj] = stat.count
        statsObj.total += stat.count
        statsObj.totalAmount += stat.totalAmount
      })

      return res.json({
        success: true,
        data: {
          activities: transformedActivities,
          total,
          hasMore: offset + limit < total,
          stats: statsObj
        }
      })
    }

    if (action === 'get-activity-details') {
      const { activityId } = req.body
      
      const activity = await Activity.findById(activityId)
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        })
      }

      // Get user information
      const user = await User.findOne({ userId: activity.userId }).select('userId username email phone')

      return res.json({
        success: true,
        data: {
          activity: {
            ...activity,
            _id: activity._id.toString(),
            user
          }
        }
      })
    }

    if (action === 'update-activity-status') {
      const { activityId, newStatus, adminNote } = req.body
      
      if (!['pending', 'completed', 'failed', 'cancelled'].includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        })
      }

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      }

      // Set completedAt if status is completed
      if (newStatus === 'completed') {
        updateData.completedAt = new Date()
      }

      // Add admin note to metadata if provided
      if (adminNote) {
        updateData.$set = {
          'metadata.adminNote': adminNote,
          'metadata.adminActionAt': new Date()
        }
      }

      const updatedActivity = await Activity.findByIdAndUpdate(
        activityId,
        updateData,
        { new: true }
      )

      if (!updatedActivity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        })
      }

      // If activity is completed and has amount, update user balance
      if (newStatus === 'completed' && updatedActivity.amount > 0) {
        await User.findOneAndUpdate(
          { userId: updatedActivity.userId },
          { $inc: { balanceTK: updatedActivity.amount } }
        )
      }
      
      return res.json({
        success: true,
        message: `Activity status updated to ${newStatus}`,
        data: {
          activity: {
            ...updatedActivity,
            _id: updatedActivity._id.toString()
          }
        }
      })
    }

    if (action === 'delete-activity') {
      const { activityId } = req.body
      
      const activity = await Activity.findByIdAndDelete(activityId)
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        })
      }

      return res.json({
        success: true,
        message: 'Activity deleted successfully'
      })
    }

    if (action === 'bulk-update-status') {
      const { activityIds, newStatus, adminNote } = req.body
      
      if (!Array.isArray(activityIds) || activityIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Activity IDs are required'
        })
      }

      if (!['pending', 'completed', 'failed', 'cancelled'].includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        })
      }

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      }

      // Set completedAt if status is completed
      if (newStatus === 'completed') {
        updateData.completedAt = new Date()
      }

      // Add admin note if provided
      if (adminNote && adminNote.trim() !== '') {
        updateData.adminNote = adminNote.trim()
      }

      const result = await Activity.updateMany(
        { _id: { $in: activityIds } },
        updateData
      )

      return res.json({
        success: true,
        message: `${result.modifiedCount} activities updated to ${newStatus}`,
        data: { 
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      })
    }

    if (action === 'export-activities') {
      const { format = 'json', filters = {} } = req.body
      
      // Build query from filters
      const query: any = {}
      
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status
      }

      if (filters.activityType && filters.activityType !== 'all') {
        query.activityType = filters.activityType
      }

      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange
        if (startDate && endDate) {
          query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      }

      // Fetch all activities matching the filters
      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .lean()

      // Get user information
      const userIds = [...new Set(activities.map(activity => activity.userId))]
      const users = await User.find({ userId: { $in: userIds } }).select('userId username email').lean()
      const userMap = new Map(users.map(user => [user.userId, user]))

      // Transform data to include user information
      const exportData = activities.map(activity => ({
        id: activity._id,
        userId: activity.userId,
        username: userMap.get(activity.userId)?.username || 'Unknown',
        email: userMap.get(activity.userId)?.email || 'Unknown',
        activityType: activity.activityType,
        description: activity.description,
        amount: activity.amount,
        status: activity.status,
        createdAt: activity.createdAt,
        completedAt: activity.completedAt,
        adminNote: activity.adminNote
      }))

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = Object.keys(exportData[0] || {}).join(',')
        const csvRows = exportData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          ).join(',')
        )
        const csvContent = [csvHeaders, ...csvRows].join('\n')

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="activities.csv"')
        return res.send(csvContent)
      }

      return res.json({
        success: true,
        data: exportData
      })
    }

    if (action === 'get-activity-stats') {
      // Get comprehensive stats
      const totalStats = await Activity.aggregate([
        {
          $group: {
            _id: null,
            totalActivities: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        }
      ])

      const statusStats = await Activity.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])

      const typeStats = await Activity.aggregate([
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])

      const dailyStats = await Activity.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
        },
        {
          $limit: 30
        }
      ])

      return res.json({
        success: true,
        data: {
          total: totalStats[0] || { totalActivities: 0, totalAmount: 0, avgAmount: 0 },
          byStatus: statusStats,
          byType: typeStats,
          daily: dailyStats
        }
      })
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    })

  } catch (error) {
    console.error('Activities API Error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// GET route for fetching activities with query parameters
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '20')
    const offset = parseInt(req.query.offset as string || '0')
    const status = req.query.status as string || 'all'
    const activityType = req.query.activityType as string || 'all'
    const search = req.query.search as string || ''

    // Build query filter
    const query: any = {}
    
    if (status !== 'all') {
      query.status = status
    }

    if (activityType !== 'all') {
      query.activityType = activityType
    }

    if (search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i')
      query.$or = [
        { description: searchRegex },
        { activityType: searchRegex },
        { userId: isNaN(Number(search)) ? undefined : Number(search) }
      ].filter(Boolean)
    }

    // Get total count
    const total = await Activity.countDocuments(query)

    // Fetch activities
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()

    // Get user information
    const userIds = [...new Set(activities.map(activity => activity.userId))]
    const users = await User.find({ userId: { $in: userIds } }).select('userId username email').lean()
    const userMap = new Map(users.map(user => [user.userId, user]))

    // Transform data
    const transformedActivities = activities.map(activity => ({
      ...activity,
      _id: activity._id,
      user: userMap.get(activity.userId) || null
    }))

    return res.json({
      success: true,
      data: {
        activities: transformedActivities,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Admin activities GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
