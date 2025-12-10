import { Request, Response } from 'express';
import { UpdateService } from './service';


export class UpdateController {
  private updateService: UpdateService;

  constructor() {
    this.updateService = new UpdateService();
  }

  /**
   * Check for app updates
   * GET /api/v1/update/check
   */
  checkUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
      const updateInfo = await this.updateService.getLatestUpdateInfo();

      res.status(200).json({
        success: true,
        message: 'Update information retrieved successfully',
        data: updateInfo
      });
    } catch (error) {
      console.error('Check update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve update information',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Check if specific version needs update
   * GET /api/v1/update/version/:version
   */
  checkVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { version } = req.params;

      if (!version) {
        res.status(400).json({
          success: false,
          error: 'Version parameter is required',
          message: 'Please provide a valid version number'
        });
        return;
      }

      // Validate version format (basic semver check)
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(version)) {
        res.status(400).json({
          success: false,
          error: 'Invalid version format',
          message: 'Version must be in format x.y.z (e.g., 3.1.8)'
        });
        return;
      }

      const versionCheck = await this.updateService.checkVersionNeedsUpdate(version);

      res.status(200).json({
        success: true,
        message: 'Version check completed',
        data: versionCheck
      });
    } catch (error) {
      console.error('Check version error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check version',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };
}

export const updateController = new UpdateController();
