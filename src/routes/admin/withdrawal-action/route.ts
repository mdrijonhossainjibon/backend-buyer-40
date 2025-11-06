import { Router, Request, Response } from 'express';
import Withdrawal from 'models/Withdrawal';
import User from 'models/User';
 

const router = Router();

// POST /api/v1/admin/withdrawal-action - Process withdrawal action (approve/reject)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { withdrawalId, action, adminNote } = req.body;

    // Validate required fields
    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    // Find the withdrawal request
    const withdrawal = await Withdrawal.findOne({ withdrawalId });
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Check if withdrawal is already processed
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`
      });
    }

    // Find the user
    const user = await User.findOne({ userId: withdrawal.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (action === 'approve') {
      // Approve withdrawal
      withdrawal.status = 'approved';
      withdrawal.processedAt = new Date();
 
      
      // Add admin note to metadata
      if (adminNote) {
        withdrawal.metadata = {
          ...withdrawal.metadata,
          adminNotes: adminNote,
          approvedAt: new Date().toISOString(),
         
        };
      }

      // Update user's withdrawn amount
      user.withdrawnAmount += withdrawal.amount;
 
      await Promise.all([withdrawal.save(), user.save()]);

      return res.json({
        success: true,
        message: 'Withdrawal request approved successfully',
        data: {
          withdrawalId: withdrawal.withdrawalId,
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          status: withdrawal.status,
          processedAt: withdrawal.processedAt,
          adminNote: adminNote || null,
          userNewWithdrawnAmount: user.withdrawnAmount
        }
      });

    } else if (action === 'reject') {
      // Reject withdrawal
      withdrawal.status = 'rejected';
      withdrawal.processedAt = new Date();
 
      withdrawal.rejectionReason = adminNote || 'Rejected by admin';
      
      // Add admin note to metadata
      if (adminNote) {
        withdrawal.metadata = {
          ...withdrawal.metadata,
          adminNotes: adminNote,
          rejectedAt: new Date().toISOString(),
      
        };
      }

      // Return the amount back to user's balance
      user.balanceTK += withdrawal.amount;
  
      await Promise.all([withdrawal.save(), user.save()]);

      return res.json({
        success: true,
        message: 'Withdrawal request rejected successfully',
        data: {
          withdrawalId: withdrawal.withdrawalId,
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          status: withdrawal.status,
          processedAt: withdrawal.processedAt,
          rejectionReason: withdrawal.rejectionReason,
          adminNote: adminNote || null,
          userNewBalance: user.balanceTK
        }
      });
    } else {
      // This should never happen due to validation above, but ensures all code paths return
      return res.status(400).json({
        success: false,
        message: 'Invalid action specified'
      });
    }

  } catch (error) {
    console.error('Error processing withdrawal action:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/admin/withdrawal-action/bulk - Process multiple withdrawal actions
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { withdrawals, adminId } = req.body;

    if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawals array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const item of withdrawals) {
      try {
        const { withdrawalId, action, adminNote } = item;

        // Validate each item
        if (!withdrawalId || !action || !['approve', 'reject'].includes(action)) {
          errors.push({
            withdrawalId: withdrawalId || 'unknown',
            error: 'Invalid withdrawal ID or action'
          });
          continue;
        }

        // Find withdrawal and user
        const withdrawal = await Withdrawal.findOne({ withdrawalId });
        if (!withdrawal) {
          errors.push({
            withdrawalId,
            error: 'Withdrawal not found'
          });
          continue;
        }

        if (withdrawal.status !== 'pending') {
          errors.push({
            withdrawalId,
            error: `Withdrawal already ${withdrawal.status}`
          });
          continue;
        }

        const user = await User.findOne({ userId: withdrawal.userId });
        if (!user) {
          errors.push({
            withdrawalId,
            error: 'User not found'
          });
          continue;
        }

        // Process the action
        withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
        withdrawal.processedAt = new Date();
        withdrawal.processedBy = adminId || 0;

        if (adminNote) {
          withdrawal.metadata = {
            ...withdrawal.metadata,
            adminNotes: adminNote,
            [`${action}dAt`]: new Date().toISOString(),
            [`${action}dBy`]: adminId || 'admin'
          };
        }

        if (action === 'approve') {
          user.withdrawnAmount += withdrawal.amount;
        } else {
          withdrawal.rejectionReason = adminNote || 'Rejected by admin';
          user.balanceTK += withdrawal.amount;
        }

        await Promise.all([withdrawal.save(), user.save()]);

        results.push({
          withdrawalId,
          action,
          status: 'success',
          amount: withdrawal.amount,
          userId: withdrawal.userId
        });

      } catch (itemError) {
        errors.push({
          withdrawalId: item.withdrawalId || 'unknown',
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      message: `Processed ${results.length} withdrawals successfully`,
      data: {
        processed: results.length,
        errorCount: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    console.error('Error processing bulk withdrawal actions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk withdrawal actions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

 

export default router;