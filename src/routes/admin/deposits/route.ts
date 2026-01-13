import { Router, Request, Response } from 'express'
import Transaction from 'models/Transaction'

const router = Router()

/**
 * GET /api/v1/admin/deposits
 * Fetch all deposits with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'all'
    const limit = parseInt(req.query.limit as string || '50')
    const offset = parseInt(req.query.offset as string || '0')

    // Build filter query - only deposits
    const filter: any = { type: 'deposit' }
    
    // Map frontend status to backend status 
    if (status && status !== 'all') {
      // Frontend uses: completed, pending, failed
      // Backend uses: confirmed, pending, failed
      if (status === 'completed') {
        filter.status = 'confirmed'
      } else {
        filter.status = status
      }
    }

    // Get deposits
    const [deposits, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 }) // Newest first
        .limit(limit)
        .skip(offset)
        .exec(),
      Transaction.countDocuments(filter)
    ])

    // Format response data to match frontend Deposit interface
    const formattedDeposits = deposits.map((deposit) => ({
      id: deposit._id,
      amount: deposit.amount.toString(),
      coin: deposit.tokenSymbol,
      network: deposit.networkName,
      txid: deposit.txHash,
      status: deposit.status === 'confirmed' ? 'completed' : deposit.status,
      time: deposit.createdAt.toISOString(),
      confirmations: deposit.confirmations,
      // Additional fields for details
      fromAddress: deposit.fromAddress,
      toAddress: deposit.toAddress,
      tokenAddress: deposit.tokenAddress,
      blockNumber: deposit.blockNumber,
      networkId: deposit.networkId,
      gasUsed: deposit.gasUsed,
      gasPrice: deposit.gasPrice,
    }))

    return res.json({
      success: true,
      data: formattedDeposits,
      total,
      hasMore: offset + limit < total,
      message: 'Deposits retrieved successfully'
    })

  } catch (error) {
    console.error('Admin deposits GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * GET /api/v1/admin/deposits/:id
 * Fetch single deposit details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const deposit = await Transaction.findOne({ 
      _id: id, 
      type: 'deposit' 
    })

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit not found'
      })
    }

    // Format response data to match frontend Deposit interface
    const formattedDeposit = {
      id: deposit._id,
      amount: deposit.amount.toString(),
      coin: deposit.tokenSymbol,
      network: deposit.networkName,
      txid: deposit.txHash,
      status: deposit.status === 'confirmed' ? 'completed' : deposit.status,
      time: deposit.createdAt.toISOString(),
      confirmations: deposit.confirmations,
      // Additional fields for details
      fromAddress: deposit.fromAddress,
      toAddress: deposit.toAddress,
      tokenAddress: deposit.tokenAddress,
      blockNumber: deposit.blockNumber,
      networkId: deposit.networkId,
      gasUsed: deposit.gasUsed,
      gasPrice: deposit.gasPrice,
    }

    return res.json({
      success: true,
      data: formattedDeposit,
      message: 'Deposit details retrieved successfully'
    })

  } catch (error) {
    console.error('Admin deposit details GET API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * POST /api/v1/admin/deposits
 * Handle deposit actions (stats, etc.)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { action } = req.body

    if (action === 'get-stats') {
      const stats = await Transaction.aggregate([
        { $match: { type: 'deposit' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])

      const summary = {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        totalAmount: 0
      }

      stats.forEach(stat => {
        summary.total += stat.count
        if (stat._id === 'confirmed') {
          summary.completed = stat.count
        } else if (stat._id === 'pending') {
          summary.pending = stat.count
        } else if (stat._id === 'failed') {
          summary.failed = stat.count
        }
        summary.totalAmount += stat.totalAmount
      })

      return res.json({
        success: true,
        data: summary,
        message: 'Deposit statistics retrieved successfully'
      })
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    })

  } catch (error) {
    console.error('Admin deposits POST API error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
