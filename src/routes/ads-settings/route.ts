import { Router, Request, Response } from 'express'
import { verifySignature } from 'lib/auth';
import AdsSettings from 'models/AdsSettings'
 
 
const router = Router();
// GET /ads-settings - Get all ads settings
router.get('/ads/settings', async (req: Request, res: Response) => {
  try {
    const adsSettings = await AdsSettings.findOne({})
      .sort({ createdAt: -1 })
      

    return res.json({
      success: true,
      data: adsSettings
    });

  } catch (error) {
    console.error('Ads Settings GET error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;
