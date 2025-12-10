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
        withdrawalId: withdrawal.withdrawalId, // Matches 'transactionId' in frontend
        userId: withdrawal.userId,
        username: user?.username || `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Unknown User',
        amount: withdrawal.amount,
        currency: withdrawal.currency, // USDT, BTC, ETH, BNB, TRX
        network: withdrawal.network, // TRC20, ERC20, BEP20, etc.
        address: withdrawal.address, // Wallet address
        status: withdrawal.status, // 'completed' | 'pending' | 'failed' | 'processing'
        requestedAt: withdrawal.requestedAt, // Matches 'date' in frontend
        fee: withdrawal.fee,
        txHash: withdrawal.txHash, // Blockchain transaction hash
        processedAt: withdrawal.processedAt,
        processedBy: withdrawal.processedBy,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt
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
          withdrawalId: withdrawal.withdrawalId, // Matches 'transactionId' in frontend
          userId: withdrawal.userId,
          username: user?.username || `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Unknown User',
          amount: withdrawal.amount,
          currency: withdrawal.currency, // USDT, BTC, ETH, BNB, TRX
          network: withdrawal.network, // TRC20, ERC20, BEP20, etc.
          address: withdrawal.address, // Wallet address
          status: withdrawal.status, // 'completed' | 'pending' | 'failed' | 'processing'
          requestedAt: withdrawal.requestedAt, // Matches 'date' in frontend
          fee: withdrawal.fee,
          txHash: withdrawal.txHash, // Blockchain transaction hash
          processedAt: withdrawal.processedAt,
          processedBy: withdrawal.processedBy,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt
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

// GET route for fetching a specific withdrawal by ID
router.get('/:withdrawalId', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params

    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      })
    }

    // Find the withdrawal
    const withdrawal = await Withdrawal.findOne({ withdrawalId })
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      })
    }

    // Get user information
    const user = await User.findOne({ userId: withdrawal.userId })

    // Format response data
    const formattedWithdrawal = {
      withdrawalId: withdrawal.withdrawalId,
      userId: withdrawal.userId,
      username: user?.username || `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Unknown User',
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      network: withdrawal.network,
      address: withdrawal.address,
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt,
      fee: withdrawal.fee,
      txHash: withdrawal.txHash,
      processedAt: withdrawal.processedAt,
      processedBy: withdrawal.processedBy,
      rejectionReason: withdrawal.rejectionReason,
      metadata: withdrawal.metadata,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt
    }

    return res.json({
      success: true,
      data: formattedWithdrawal,
      message: 'Withdrawal retrieved successfully'
    })

  } catch (error) {
    console.error('Admin withdrawal GET by ID API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
