import { getDesktopBridge } from "@/lib/desktopBridge";
import type {
  UpdateApiError,
  UpdateCheckResult,
  UpdateInstallState
} from "./types";
import { createIdleUpdateInstallState } from "./types";

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

export async function getUpdateInstallState(): Promise<UpdateInstallState> {
  const bridge = getDesktopBridge();
  if (!bridge?.getUpdateInstallState) {
    return createIdleUpdateInstallState();
  }

  try {
    return await bridge.getUpdateInstallState();
  } catch (error) {
    throw toUpdateApiError(error);
  }
}

export async function startUpdateInstall(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge?.startUpdateInstall) {
    throw {
      code: "update_install_unavailable",
      message: "当前运行环境不支持应用内升级。"
    } satisfies UpdateApiError;
  }

  try {
    await bridge.startUpdateInstall();
  } catch (error) {
    throw toUpdateApiError(error);
  }
}

export function subscribeToUpdateInstallState(
  listener: (state: UpdateInstallState) => void
) {
  const bridge = getDesktopBridge();
  if (!bridge?.onUpdateInstallState) {
    return () => undefined;
  }

  return bridge.onUpdateInstallState(listener);
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
