import { UpdateInfo, VersionCheck } from './types';

export class UpdateService {
  /**
   * Get the latest update information
   */
  async getLatestUpdateInfo(): Promise<UpdateInfo> {
    try {
      // In a real application, this would fetch from a database or external service
      // For now, we'll return static data that can be easily modified
      const updateInfo: UpdateInfo = {
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
        ]
      };

      return updateInfo;
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
    // This would typically fetch from a database
    // For now, return mock data
    return {
      totalDownloads: 1250,
      successfulUpdates: 1180,
      failedUpdates: 70,
      lastUpdateCheck: new Date()
    };
  }
}
