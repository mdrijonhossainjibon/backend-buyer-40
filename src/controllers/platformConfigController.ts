import { Request, Response } from 'express';
import PlatformConfig from 'models/PlatformConfig';

export const getPlatformConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    let config = await PlatformConfig.findOne();
    
    // If no config exists, create default config
    if (!config) {
      config = await PlatformConfig.create({
        appName: 'Admin Panel',
        maintenanceMode: false,
        registrationEnabled: false,
        referralBonus: 0
      });
    }
    
    return res.json({
      success: true,
      message: 'Platform configuration retrieved successfully',
      data: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching platform configuration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updatePlatformConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      appName,
      maintenanceMode,
      registrationEnabled,
      referralBonus
    } = req.body;
    
    // Validate input
    if (typeof appName !== 'string' || appName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'App name is required and must be a non-empty string'
      });
    }
    
    if (typeof maintenanceMode !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Maintenance mode must be a boolean value'
      });
    }
    
    if (typeof registrationEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Registration enabled must be a boolean value'
      });
    }
    
    if (typeof referralBonus !== 'number' || referralBonus < 0 || referralBonus > 100) {
      return res.status(400).json({
        success: false,
        message: 'Referral bonus must be a number between 0 and 100'
      });
    }
    
    // Find and update config
    let config = await PlatformConfig.findOne();
    
    if (!config) {
      // Create if doesn't exist
      config = await PlatformConfig.create({
        appName: appName.trim(),
        maintenanceMode,
        registrationEnabled,
        referralBonus
      });
    } else {
      // Update existing
      config.appName = appName.trim();
      config.maintenanceMode = maintenanceMode;
      config.registrationEnabled = registrationEnabled;
      config.referralBonus = referralBonus;
      
      await config.save();
    }
    
    return res.json({
      success: true,
      message: 'Platform configuration updated successfully',
      data: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error updating platform configuration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update platform configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updatePlatformConfigField = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { field } = req.params;
    const { value } = req.body;
    
    // Validate field name
    const allowedFields = ['appName', 'maintenanceMode', 'registrationEnabled', 'referralBonus'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field. Allowed fields: ${allowedFields.join(', ')}`
      });
    }
    
    // Validate value based on field
    let validatedValue = value;
    
    switch (field) {
      case 'appName':
        if (typeof value !== 'string' || value.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'App name must be a non-empty string'
          });
        }
        validatedValue = value.trim();
        break;
        
      case 'maintenanceMode':
      case 'registrationEnabled':
        if (typeof value !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `${field} must be a boolean value`
          });
        }
        break;
        
      case 'referralBonus':
        if (typeof value !== 'number' || value < 0 || value > 100) {
          return res.status(400).json({
            success: false,
            message: 'Referral bonus must be a number between 0 and 100'
          });
        }
        break;
    }
    
    // Find and update config
    let config = await PlatformConfig.findOne();
    
    if (!config) {
      // Create default config first
      config = await PlatformConfig.create({
        appName: 'Admin Panel',
        maintenanceMode: false,
        registrationEnabled: false,
        referralBonus: 0
      });
    }
    
    // Update specific field
    (config as any)[field] = validatedValue;
    await config.save();
    
    return res.json({
      success: true,
      message: `Platform configuration field '${field}' updated successfully`,
      data: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Error updating platform configuration field ${req.params.field}:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to update platform configuration field '${req.params.field}'`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const resetPlatformConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Delete existing config
    await PlatformConfig.deleteMany({});
    
    // Create default config
    const defaultConfig = await PlatformConfig.create({
      appName: 'Admin Panel',
      maintenanceMode: false,
      registrationEnabled: false,
      referralBonus: 0
    });
    
    return res.json({
      success: true,
      message: 'Platform configuration reset to defaults successfully',
      data: defaultConfig,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error resetting platform configuration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset platform configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
