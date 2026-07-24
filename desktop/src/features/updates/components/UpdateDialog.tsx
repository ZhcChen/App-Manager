import { useEffect, useState } from "react";
import type { UpdateCheckResult, UpdatePlatform, UpdateReleaseAsset } from "../types";

type UpdateDialogProps = {
  isOpen: boolean;
  currentVersion: string;
  result: UpdateCheckResult | null;
  error: string | null;
  isChecking: boolean;
  onClose: () => void;
  onCheckNow: () => void;
  onOpenDownload: (url: string) => Promise<void> | void;
};

type UpgradeState = "idle" | "preparing" | "ready" | "failed";

const PLATFORM_LABELS: Record<UpdatePlatform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  unknown: "未知平台"
};

const FORMAT_LABELS: Record<string, string> = {
  appimage: "AppImage",
  deb: "DEB",
  dmg: "DMG",
  exe: "EXE 安装器",
  zip: "ZIP"
};

function formatAssetLabel(asset: UpdateReleaseAsset) {
  const format = FORMAT_LABELS[asset.format] ?? asset.format.toUpperCase();
  return `${PLATFORM_LABELS[asset.platform]} ${asset.arch} · ${format}`;
}

function getDialogTitle(
  result: UpdateCheckResult | null,
  error: string | null,
  isChecking: boolean
) {
  if (isChecking && !result) {
    return "正在检测更新";
  }

  if (error && !result) {
    return "暂时无法检测更新";
  }

  return result?.hasUpdate ? "发现新版本" : "当前已是最新版本";
}

function getUpgradeStatusCopy(upgradeState: UpgradeState) {
  if (upgradeState === "preparing") {
    return "正在准备升级文件...";
  }

  if (upgradeState === "ready") {
    return "已打开下载页面，请按系统提示完成安装。";
  }

  if (upgradeState === "failed") {
    return "升级入口打开失败，请稍后重试。";
  }

  return "点击升级后，会打开当前系统对应安装包的下载页面。";
}

export function UpdateDialog(props: UpdateDialogProps) {
  const {
    isOpen,
    currentVersion,
    result,
    error,
    isChecking,
    onClose,
    onCheckNow,
    onOpenDownload
  } = props;
  const [upgradeState, setUpgradeState] = useState<UpgradeState>("idle");
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const currentAssets = result?.currentPlatformAssets ?? [];
  const primaryAsset = currentAssets[0] ?? null;
  const dialogTitle = getDialogTitle(result, error, isChecking);

  useEffect(() => {
    setUpgradeState("idle");
    setUpgradeProgress(0);
  }, [isOpen, result?.latestTag]);

  useEffect(() => {
    if (upgradeState !== "preparing") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setUpgradeProgress((current) => Math.min(current + 12, 88));
    }, 240);

    return () => {
      window.clearInterval(timer);
    };
  }, [upgradeState]);

  if (!isOpen) {
    return null;
  }

  const handleUpgrade = async () => {
    if (!primaryAsset || upgradeState === "preparing") {
      return;
    }

    setUpgradeState("preparing");
    setUpgradeProgress(18);

    try {
      await Promise.resolve(onOpenDownload(primaryAsset.url));
      setUpgradeProgress(100);
      setUpgradeState("ready");
    } catch {
      setUpgradeProgress(0);
      setUpgradeState("failed");
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        className="dialog update-dialog"
        role="dialog"
      >
        <p className="dialog-eyebrow">应用升级</p>
        <h2 id="update-dialog-title">{dialogTitle}</h2>

        <div className="update-version-card">
          <div>
            <span>当前版本</span>
            <strong>v{result?.currentVersion ?? currentVersion}</strong>
          </div>
          <div>
            <span>最新版本</span>
            <strong>
              {result?.latestVersion ? `v${result.latestVersion}` : "--"}
            </strong>
          </div>
        </div>

        {error ? (
          <p className="update-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        {result?.hasUpdate ? (
          <div className="update-upgrade-card">
            <div className="update-device-row">
              <span>当前设备</span>
              <strong>
                {PLATFORM_LABELS[result.currentPlatform]} {result.currentArch}
              </strong>
            </div>

            {primaryAsset ? (
              <>
                <p className="update-upgrade-card__copy">
                  已匹配安装包：{formatAssetLabel(primaryAsset)}
                </p>
                <button
                  type="button"
                  className="primary-download-button update-upgrade-button"
                  disabled={upgradeState === "preparing"}
                  onClick={() => {
                    void handleUpgrade();
                  }}
                >
                  {upgradeState === "preparing"
                    ? "正在升级..."
                    : `升级到 v${result.latestVersion ?? ""}`}
                </button>
                <div className="update-progress-area">
                  <div
                    className={`update-progress-bar ${
                      upgradeState === "preparing" ? "is-active" : ""
                    }`}
                    role="progressbar"
                    aria-label="升级进度"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={upgradeProgress}
                  >
                    <span style={{ width: `${upgradeProgress}%` }} />
                  </div>
                  <p>{getUpgradeStatusCopy(upgradeState)}</p>
                </div>
              </>
            ) : (
              <p className="dialog-copy">
                当前设备暂无可用安装包，请稍后等待对应平台构建完成。
              </p>
            )}
          </div>
        ) : result ? (
          <p className="dialog-copy">
            当前设备是 {PLATFORM_LABELS[result.currentPlatform]}{" "}
            {result.currentArch}，暂时没有可用更新。
          </p>
        ) : error ? null : (
          <p className="dialog-copy">暂无可展示的下载资产。</p>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isChecking}
            onClick={onCheckNow}
          >
            {isChecking ? "检测中..." : "重新检测"}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}
