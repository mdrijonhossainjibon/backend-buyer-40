import { Router, Request, Response } from 'express';
import { swapController } from 'services/socket';
 

const router = Router();
 

/**
 * POST /api/v1/swap
 * Initiate a token swap
 * Returns pending status immediately, WebSocket events will follow
 */
router.post('/swap', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, fromToken, toToken, fromAmount, toAmount } = req.body;

    // Validate required fields
    if (!userId || !fromToken || !toToken || !fromAmount || !toAmount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, fromToken, toToken, fromAmount, toAmount',
      });
      return;
    }

    // Validate amounts
    if (fromAmount <= 0 || toAmount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid amounts: fromAmount and toAmount must be greater than 0',
      });
      return;
    }

    // Generate swap ID
    const swapId = 'SWAP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
 

    // Return pending status immediately
    const response = {
      success: true,
      data: {
        swapId,
        userId,
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        status: 'pending',
        message: 'Swap request received and is being processed',
        timestamp: new Date(),
      },
    };

    // Send response immediately
    res.status(200).json(response);

    // Send SWAP_INITIATED event immediately
    await swapController.broadcastSwapInitiated(userId, swapId, fromToken, toToken, fromAmount, toAmount);
 
    // Process swap in background (async - don't await)
    swapController.processSwap(userId, swapId, fromToken, toToken, fromAmount, toAmount).catch(err => {
      console.error('Error processing swap:', err);
    });
   
  } catch (error: any) {
    console.error('❌ Error in swap API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/swap/:swapId
 * Get swap status by ID
 */
router.get('/swap/:swapId', async (req: Request, res: Response) => {
  try {
    const { swapId } = req.params;

    // In production, you would fetch this from database
    // For now, return a mock response
    res.status(200).json({
      success: true,
      data: {
        swapId,
        status: 'pending',
        message: 'Swap status can be tracked via WebSocket events',
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching swap status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
