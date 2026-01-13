import { UpdateInfo, VersionCheck } from './types';
import { UpdateInfo as UpdateInfoModel, UpdateStats as UpdateStatsModel, UpdateDownload as UpdateDownloadModel, IUpdateInfo, IUpdateStats } from '../../models';

export class UpdateService {
  /**
   * Get the latest update information
   */
  async getLatestUpdateInfo(): Promise<UpdateInfo> {
    try {
      // Get the latest active update from database
      const latestUpdate = await UpdateInfoModel.findOne({ isActive: true })
        .sort({ releaseDate: -1 })
        .lean() as IUpdateInfo | null;

      if (!latestUpdate) {
        // If no update found in database, create a default one
        const defaultUpdate = new UpdateInfoModel({
          version: '3.2.8',
          currentVersion: '3.2.8',
          size: '125.4 MB',
          description: 'Update your application to the latest version to enjoy new features and improvements. This update includes bug fixes, performance improvements, and new features.',
          downloadUrl: 'https://mdrijonhossajibon.shop/app-release.apk',
          packageName: 'com.rn_panel',
          fileName: 'app-release.apk',
          releaseDate: new Date('2024-11-30T08:00:00Z'),
          isForceUpdate: false,
          minSupportedVersion: '3.0.0',
          changelog: [
            'Fixed critical security vulnerabilities',
            'Improved app performance and stability',
            'Added new user interface enhancements',
            'Enhanced notification system',
            'Bug fixes and optimizations'
          ],
          isActive: true
        });

        await defaultUpdate.save();
        return this.formatUpdateInfo(defaultUpdate);
      }

      return this.formatUpdateInfo(latestUpdate);
    } catch (error) {
      console.error('Error getting update info:', error);
      throw new Error('Failed to retrieve update information');
    }
  }

  /**
   * Check if a specific version needs update
   */
  async checkVersionNeedsUpdate(currentVersion: string): Promise<VersionCheck> {
    try {
      const latestInfo = await this.getLatestUpdateInfo();
      const latestVersion = latestInfo.version;
      const minSupportedVersion = latestInfo.minSupportedVersion;

      // Compare versions using semantic versioning
      const needsUpdate = this.compareVersions(currentVersion, latestVersion) < 0;
      const isSupported = this.compareVersions(currentVersion, minSupportedVersion) >= 0;
      const isForceUpdate = !isSupported || latestInfo.isForceUpdate;

      return {
        needsUpdate,
        currentVersion,
        latestVersion,
        isForceUpdate,
        isSupported,
        minSupportedVersion
      };
    } catch (error) {
      console.error('Error checking version:', error);
      throw new Error('Failed to check version compatibility');
    }
  }

  /**
   * Compare two semantic versions
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  /**
   * Get update statistics (for admin purposes)
   */
  async getUpdateStats(): Promise<{
    totalDownloads: number;
    successfulUpdates: number;
    failedUpdates: number;
    lastUpdateCheck: Date;
  }> {
    try {
      // Get the latest stats from database
      const latestStats = await UpdateStatsModel.findOne()
        .sort({ lastUpdateCheck: -1 })
        .lean() as IUpdateStats | null;

      if (!latestStats) {
        // Create default stats if none exist
        const defaultStats = new UpdateStatsModel({
          version: '3.2.8',
          totalDownloads: 1250,
          successfulUpdates: 1180,
          failedUpdates: 70,
          lastUpdateCheck: new Date(),
          platform: 'all',
          deviceStats: {
            android: 800,
            ios: 450
          }
        });

        await defaultStats.save();
        return {
          totalDownloads: defaultStats.totalDownloads,
          successfulUpdates: defaultStats.successfulUpdates,
          failedUpdates: defaultStats.failedUpdates,
          lastUpdateCheck: defaultStats.lastUpdateCheck
        };
      }

      return {
        totalDownloads: latestStats.totalDownloads,
        successfulUpdates: latestStats.successfulUpdates,
        failedUpdates: latestStats.failedUpdates,
        lastUpdateCheck: latestStats.lastUpdateCheck
      };
    } catch (error) {
      console.error('Error getting update stats:', error);
      throw new Error('Failed to retrieve update statistics');
    }
  }

  /**
   * Format update info from database model to interface
   */
  private formatUpdateInfo(updateModel: IUpdateInfo): UpdateInfo {
    return {
      version: updateModel.version,
      currentVersion: updateModel.currentVersion,
      size: updateModel.size,
      description: updateModel.description,
      downloadUrl: updateModel.downloadUrl,
      packageName: updateModel.packageName,
      fileName: updateModel.fileName,
      releaseDate: updateModel.releaseDate,
      isForceUpdate: updateModel.isForceUpdate,
      minSupportedVersion: updateModel.minSupportedVersion,
      changelog: updateModel.changelog || []
    };
  }

  /**
   * Record a download attempt
   */
  async recordDownloadAttempt(
    version: string,
    platform: 'android' | 'ios',
    userId?: number,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const downloadRecord = new UpdateDownloadModel({
        version,
        platform,
        userId,
        deviceId,
        updateStatus: 'pending',
        ipAddress,
        userAgent
      });

      await downloadRecord.save();
      return downloadRecord._id.toString();
    } catch (error) {
      console.error('Error recording download attempt:', error);
      throw new Error('Failed to record download attempt');
    }
  }

  /**
   * Update download status
   */
  async updateDownloadStatus(
    downloadId: string,
    status: 'downloading' | 'completed' | 'failed' | 'cancelled',
    errorMessage?: string,
    progress?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        updateStatus: status,
        downloadProgress: progress
      };

      if (status === 'completed') {
        updateData.downloadCompleted = new Date();
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await UpdateDownloadModel.findByIdAndUpdate(downloadId, updateData);

      // Update stats based on status
      if (status === 'completed' || status === 'failed') {
        await this.updateStatsForDownload(status);
      }
    } catch (error) {
      console.error('Error updating download status:', error);
      throw new Error('Failed to update download status');
    }
  }

  /**
   * Update statistics when a download completes or fails
   */
  private async updateStatsForDownload(status: 'completed' | 'failed'): Promise<void> {
    try {
      const latestUpdate = await UpdateInfoModel.findOne({ isActive: true })
        .sort({ releaseDate: -1 });

      if (!latestUpdate) return;

      let stats = await UpdateStatsModel.findOne({ version: latestUpdate.version });

      if (!stats) {
        stats = new UpdateStatsModel({
          version: latestUpdate.version,
          platform: 'all'
        });
      }

      stats.totalDownloads += 1;
      stats.lastUpdateCheck = new Date();

      if (status === 'completed') {
        stats.successfulUpdates += 1;
      } else {
        stats.failedUpdates += 1;
      }

      await stats.save();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }
}
