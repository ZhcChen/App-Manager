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

export type UpdateInstallPhase =
  | "idle"
  | "checking"
  | "downloading"
  | "downloaded"
  | "installing"
  | "failed";

export type UpdateInstallState = {
  phase: UpdateInstallPhase;
  version: string | null;
  progressPercent: number;
  transferredBytes: number | null;
  totalBytes: number | null;
  bytesPerSecond: number | null;
  message: string | null;
};

export function createIdleUpdateInstallState(): UpdateInstallState {
  return {
    phase: "idle",
    version: null,
    progressPercent: 0,
    transferredBytes: null,
    totalBytes: null,
    bytesPerSecond: null,
    message: null
  };
}
