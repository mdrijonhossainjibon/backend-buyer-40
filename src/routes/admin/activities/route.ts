import { Router, Request, Response } from 'express'
import Activity from 'models/Activity'

const router = Router()

// GET route for fetching activities with query parameters
router.get('/', async (req: Request, res: Response) => {
  try {
    const activityType = req.query.activityType as string || 'all'
    const status = req.query.status as string || 'all'
    const search = req.query.search as string || ''
    const sortBy = req.query.sortBy as string || 'newest'
    const limit = parseInt(req.query.limit as string || '100')
    const offset = parseInt(req.query.offset as string || '0')

    // Build query filter
    const query: any = {}

    // Filter by activity type if provided
    if (activityType && activityType !== 'all') {
      query.activityType = activityType
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status
    }

    // Filter by search query if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim()
      const searchConditions: any[] = []

      // Search by description
      searchConditions.push({ description: new RegExp(searchTerm, 'i') })

      // Search by userId if numeric
      if (!isNaN(Number(searchTerm))) {
        searchConditions.push({ userId: Number(searchTerm) })
      }

      // Search by _id
      searchConditions.push({ _id: new RegExp(searchTerm, 'i') })

      if (searchConditions.length > 0) {
        query.$or = searchConditions
      }
    }

    // Determine sort order
    let sortOption: any = { createdAt: -1 } // default: newest
    switch (sortBy) {
      case 'oldest':
        sortOption = { createdAt: 1 }
        break
      case 'amount_high':
        sortOption = { amount: -1 }
        break
      case 'amount_low':
        sortOption = { amount: 1 }
        break
      default:
        sortOption = { createdAt: -1 }
    }

    // Get total count for pagination
    const total = await Activity.countDocuments(query)

    // Fetch activities with pagination
    const activities = await Activity.find(query)
      .sort(sortOption)
      .skip(offset)
      .limit(limit)
      .lean()

    // Get statistics
    const allActivities = await Activity.find({}).select('status amount').lean()
    const stats = {
      total: allActivities.length,
      completed: allActivities.filter(a => a.status === 'completed').length,
      pending: allActivities.filter(a => a.status === 'pending').length,
      failed: allActivities.filter(a => a.status === 'failed').length,
      totalAmount: allActivities
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.amount || 0), 0)
    }

    return res.json({
      success: true,
      data: activities,
      total,
      hasMore: offset + limit < total,
      stats
    })

  } catch (error) {
    console.error('Admin activities GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// GET route for fetching a single activity by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const activity = await Activity.findById(id).lean()

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      })
    }

    return res.json({
      success: true,
      data: activity
    })

  } catch (error) {
    console.error('Admin activity GET by ID API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// GET route for fetching activities by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const limit = parseInt(req.query.limit as string || '50')
    const offset = parseInt(req.query.offset as string || '0')

    const query = { userId: Number(userId) }

    const total = await Activity.countDocuments(query)

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()

    return res.json({
      success: true,
      data: activities,
      total,
      hasMore: offset + limit < total
    })

  } catch (error) {
    console.error('Admin activities by user GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// PUT route for updating activity status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      })
    }

    const updateData: any = { status, updatedAt: new Date() }
    
    // Set completedAt if status is completed
    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    const activity = await Activity.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean()

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      })
    }

    return res.json({
      success: true,
      data: activity,
      message: 'Activity status updated successfully'
    })

  } catch (error) {
    console.error('Admin activity status update API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
