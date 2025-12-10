export interface UpdateInfo {
  version: string;
  currentVersion: string;
  size: string;
  description: string;
  downloadUrl: string;
  packageName: string;
  fileName: string;
  releaseDate: Date;
  isForceUpdate: boolean;
  minSupportedVersion: string;
  changelog?: string[];
}

export interface VersionCheck {
  needsUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  isForceUpdate: boolean;
  isSupported: boolean;
  minSupportedVersion: string;
}

export interface UpdateStats {
  totalDownloads: number;
  successfulUpdates: number;
  failedUpdates: number;
  lastUpdateCheck: Date;
}

export interface UpdateRequest {
  version?: string;
  platform?: 'android' | 'ios';
  deviceId?: string;
}

export interface UpdateResponse {
  success: boolean;
  message?: string;
  data?: UpdateInfo | VersionCheck | UpdateStats;
  error?: string;
}
