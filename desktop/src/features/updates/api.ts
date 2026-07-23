import { getDesktopBridge } from "@/lib/desktopBridge";
import type { UpdateApiError, UpdateCheckResult } from "./types";

export function createNoUpdateResult(currentVersion: string): UpdateCheckResult {
  return {
    currentVersion,
    latestVersion: currentVersion,
    latestTag: `v${currentVersion}`,
    hasUpdate: false,
    releaseName: null,
    releaseUrl: null,
    releaseNotes: "",
    publishedAt: null,
    checkedAt: new Date().toISOString(),
    currentPlatform: "unknown",
    currentArch: "unknown",
    assets: [],
    currentPlatformAssets: []
  };
}

export async function checkForUpdates(
  currentVersion: string
): Promise<UpdateCheckResult> {
  const bridge = getDesktopBridge();
  if (!bridge?.checkForUpdates) {
    return createNoUpdateResult(currentVersion);
  }

  try {
    return await bridge.checkForUpdates();
  } catch (error) {
    throw toUpdateApiError(error);
  }
}

export async function openUpdateDownload(url: string): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge?.openUpdateDownload) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    await bridge.openUpdateDownload(url);
  } catch (error) {
    throw toUpdateApiError(error);
  }
}

export function toUpdateApiError(error: unknown): UpdateApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  ) {
    return {
      code: String((error as { code: unknown }).code),
      message: String((error as { message: unknown }).message)
    };
  }

  if (error instanceof Error) {
    return {
      code: "update_failed",
      message: error.message
    };
  }

  if (typeof error === "string") {
    return {
      code: "update_failed",
      message: error
    };
  }

  return {
    code: "update_failed",
    message: "更新操作失败。"
  };
}
