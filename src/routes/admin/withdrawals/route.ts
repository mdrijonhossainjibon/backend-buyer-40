import { Router, Request, Response } from 'express'
import Withdrawal from 'models/Withdrawal'
import User from 'models/User'

const router = Router()

// GET route for fetching withdrawals with query parameters
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'all'
    const limit = parseInt(req.query.limit as string || '50')
    const offset = parseInt(req.query.offset as string || '0')

    // Build filter query
    const filter: any = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    // Get withdrawals with user information
    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ requestedAt: -1 }) // Newest first
        .limit(limit)
        .skip(offset)
        .exec(),
      Withdrawal.countDocuments(filter)
    ])

    // Format response data
    const formattedWithdrawals = await Promise.all(withdrawals.map(async (withdrawal) => {
      const user = await User.findOne({ userId: withdrawal.userId })
      return {
        id: withdrawal.withdrawalId,
        userId: withdrawal.userId,
        username: user?.username || `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Unknown User',
        amount: withdrawal.amount,
        netAmount: withdrawal.netAmount,
        fees: withdrawal.fees,
        method: withdrawal.method,
        accountNumber: withdrawal.accountDetails?.accountNumber || '',
        accountName: withdrawal.accountDetails?.accountName || '',
        bankName: withdrawal.accountDetails?.bankName || '',
        branchName: withdrawal.accountDetails?.branchName || '',
        status: withdrawal.status,
        requestTime: withdrawal.requestedAt,
        processedTime: withdrawal.processedAt,
        processedBy: withdrawal.processedBy,
        rejectionReason: withdrawal.rejectionReason,
        transactionId: withdrawal.transactionId,
        adminNote: withdrawal.metadata?.adminNotes || null
      }
    }))

    return res.json({
      success: true,
      data: {
        withdrawals: formattedWithdrawals,
        total,
        hasMore: offset + limit < total
      },
      message: 'Withdrawals retrieved successfully'
    })

  } catch (error) {
    console.error('Admin withdrawals GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, status = 'all', limit = 50, offset = 0 } = req.body
      
    if (action === 'list-withdrawals') {
      // Build filter query
      const filter: any = {}
      if (status && status !== 'all') {
        filter.status = status
      }

      // Get withdrawals with user information
      const [withdrawals, total] = await Promise.all([
        Withdrawal.find(filter)
          .sort({ requestedAt: -1 }) // Newest first
          .limit(limit)
          .skip(offset)
          .exec(),
        Withdrawal.countDocuments(filter)
      ])

      // Format response data
      const formattedWithdrawals = await Promise.all(withdrawals.map(async (withdrawal) => {
        const user = await User.findOne({ userId: withdrawal.userId })
        return {
          id: withdrawal.withdrawalId,
          userId: withdrawal.userId,
          username: user?.username || `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Unknown User',
          amount: withdrawal.amount,
          netAmount: withdrawal.netAmount,
          fees: withdrawal.fees,
          method: withdrawal.method,
          accountNumber: withdrawal.accountDetails?.accountNumber || '',
          accountName: withdrawal.accountDetails?.accountName || '',
          bankName: withdrawal.accountDetails?.bankName || '',
          branchName: withdrawal.accountDetails?.branchName || '',
          status: withdrawal.status,
          requestTime: withdrawal.requestedAt,
          processedTime: withdrawal.processedAt,
          processedBy: withdrawal.processedBy,
          rejectionReason: withdrawal.rejectionReason,
          transactionId: withdrawal.transactionId,
          adminNote: withdrawal.metadata?.adminNotes || null
        }
      }))

      return res.json({
        success: true,
        data: {
          withdrawals: formattedWithdrawals,
          total,
          hasMore: offset + limit < total
        },
        message: 'Withdrawals retrieved successfully'
      })
    }

    if (action === 'get-stats') {
      const stats = await Withdrawal.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$fees' }
          }
        }
      ])

      const summary = {
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        totalAmount: 0,
        totalFees: 0
      }

      stats.forEach(stat => {
        summary.total += stat.count
        if (stat._id && typeof stat._id === 'string' && stat._id in summary) {
          (summary as any)[stat._id] = stat.count
        }
        summary.totalAmount += stat.totalAmount
        summary.totalFees += stat.totalFees
      })

      return res.json({
        success: true,
        data: summary,
        message: 'Withdrawal statistics retrieved successfully'
      })
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    })

  } catch (error) {
    console.error('Admin withdrawals POST API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
