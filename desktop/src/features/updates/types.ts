export type UpdatePlatform = "macos" | "windows" | "linux" | "unknown";
export type UpdateArch = "x64" | "arm64" | "unknown";
export type UpdateAssetFormat =
  | "dmg"
  | "exe"
  | "appimage"
  | "deb"
  | "zip"
  | "unknown";

export type UpdateReleaseAsset = {
  name: string;
  url: string;
  platform: UpdatePlatform;
  arch: UpdateArch;
  format: UpdateAssetFormat;
  isCurrentPlatform: boolean;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  hasUpdate: boolean;
  releaseName: string | null;
  releaseUrl: string | null;
  releaseNotes: string;
  publishedAt: string | null;
  checkedAt: string;
  currentPlatform: UpdatePlatform;
  currentArch: UpdateArch;
  assets: UpdateReleaseAsset[];
  currentPlatformAssets: UpdateReleaseAsset[];
};

export type UpdateApiError = {
  code: string;
  message: string;
};

export type UpdateCheckReason = "initial" | "interval" | "focus" | "manual";
