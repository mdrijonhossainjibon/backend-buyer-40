import { Router, Request, Response } from 'express';
import AdsSettings from 'models/AdsSettings';

const router = Router();

// GET /api/v1/admin/ads/settings - Get current ads settings
router.get('/', async (req: Request, res: Response) => {
  try {
    // Find the ads settings document (there should be only one)
    let adsSettings = await AdsSettings.findOne();
    
    // If no settings exist, create default settings
    if (!adsSettings) {
      adsSettings = new AdsSettings({});
      await adsSettings.save();
    }

    return res.json({
      success: true,
      message: 'Ads settings retrieved successfully',
      data: adsSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error retrieving ads settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ads settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/admin/ads/settings - Update ads settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      enableGigaPubAds,
      gigaPubAppId,
      defaultAdsReward,
      adsWatchLimit,
      adsRewardMultiplier,
      minWatchTime,
      monetagEnabled,
      monetagZoneId
    } = req.body;

    // Validation
    const errors: string[] = [];

    // Validate defaultAdsReward
    if (defaultAdsReward !== undefined) {
      if (typeof defaultAdsReward !== 'number' || defaultAdsReward < 1 || defaultAdsReward > 1000) {
        errors.push('defaultAdsReward must be a number between 1 and 1000');
      }
    }

    // Validate adsWatchLimit
    if (adsWatchLimit !== undefined) {
      if (typeof adsWatchLimit !== 'number' || adsWatchLimit < 1 || adsWatchLimit > 100) {
        errors.push('adsWatchLimit must be a number between 1 and 100');
      }
    }

    // Validate adsRewardMultiplier
    if (adsRewardMultiplier !== undefined) {
      if (typeof adsRewardMultiplier !== 'number' || adsRewardMultiplier < 0.1 || adsRewardMultiplier > 10.0) {
        errors.push('adsRewardMultiplier must be a number between 0.1 and 10.0');
      }
    }

    // Validate minWatchTime
    if (minWatchTime !== undefined) {
      if (typeof minWatchTime !== 'number' || minWatchTime < 5 || minWatchTime > 300) {
        errors.push('minWatchTime must be a number between 5 and 300 seconds');
      }
    }

    // Validate boolean fields
    if (enableGigaPubAds !== undefined && typeof enableGigaPubAds !== 'boolean') {
      errors.push('enableGigaPubAds must be a boolean');
    }

    if (monetagEnabled !== undefined && typeof monetagEnabled !== 'boolean') {
      errors.push('monetagEnabled must be a boolean');
    }

    // Validate string fields
    if (gigaPubAppId !== undefined && typeof gigaPubAppId !== 'string') {
      errors.push('gigaPubAppId must be a string');
    }

    if (monetagZoneId !== undefined && typeof monetagZoneId !== 'string') {
      errors.push('monetagZoneId must be a string');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors
      });
    }

    // Find existing settings or create new one
    let adsSettings = await AdsSettings.findOne();
    
    if (!adsSettings) {
      // Create new settings with provided data
      adsSettings = new AdsSettings(req.body);
    } else {
      // Update existing settings
      if (enableGigaPubAds !== undefined) adsSettings.enableGigaPubAds = enableGigaPubAds;
      if (gigaPubAppId !== undefined) adsSettings.gigaPubAppId = gigaPubAppId;
      if (defaultAdsReward !== undefined) adsSettings.defaultAdsReward = defaultAdsReward;
      if (adsWatchLimit !== undefined) adsSettings.adsWatchLimit = adsWatchLimit;
      if (adsRewardMultiplier !== undefined) adsSettings.adsRewardMultiplier = adsRewardMultiplier;
      if (minWatchTime !== undefined) adsSettings.minWatchTime = minWatchTime;
      if (monetagEnabled !== undefined) adsSettings.monetagEnabled = monetagEnabled;
      if (monetagZoneId !== undefined) adsSettings.monetagZoneId = monetagZoneId;
    }

    // Save the updated settings
    await adsSettings.save();

    return res.json({
      success: true,
      message: 'Ads settings updated successfully',
      data: adsSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating ads settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update ads settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;