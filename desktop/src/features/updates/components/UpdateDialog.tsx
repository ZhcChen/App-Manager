import type {
  UpdateCheckResult,
  UpdateInstallPhase,
  UpdateInstallState,
  UpdatePlatform
} from "../types";

type UpdateDialogProps = {
  isOpen: boolean;
  currentVersion: string;
  result: UpdateCheckResult | null;
  error: string | null;
  isChecking: boolean;
  installState: UpdateInstallState;
  onClose: () => void;
  onCheckNow: () => void;
  onStartInstall: () => Promise<void> | void;
};

const PLATFORM_LABELS: Record<UpdatePlatform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  unknown: "未知平台"
};

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

function getUpgradeButtonLabel(
  phase: UpdateInstallPhase,
  latestVersion: string | null
) {
  if (phase === "checking") {
    return "正在检查...";
  }

  if (phase === "downloading") {
    return "正在下载...";
  }

  if (phase === "downloaded" || phase === "installing") {
    return "正在安装...";
  }

  return `升级到 v${latestVersion ?? ""}`;
}

function getUpgradeStatusCopy(state: UpdateInstallState) {
  if (state.message) {
    return state.message;
  }

  return "点击升级后，应用会在后台下载更新并自动安装。";
}

function isUpgradeBusy(phase: UpdateInstallPhase) {
  return (
    phase === "checking" ||
    phase === "downloading" ||
    phase === "downloaded" ||
    phase === "installing"
  );
}

export function UpdateDialog(props: UpdateDialogProps) {
  const {
    isOpen,
    currentVersion,
    result,
    error,
    isChecking,
    installState,
    onClose,
    onCheckNow,
    onStartInstall
  } = props;
  const currentAssets = result?.currentPlatformAssets ?? [];
  const hasCurrentPlatformUpdate = currentAssets.length > 0;
  const dialogTitle = getDialogTitle(result, error, isChecking);

  if (!isOpen) {
    return null;
  }

  const handleUpgrade = async () => {
    if (!hasCurrentPlatformUpdate || isUpgradeBusy(installState.phase)) {
      return;
    }

    await Promise.resolve(onStartInstall());
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

            {hasCurrentPlatformUpdate ? (
              <>
                <p className="update-upgrade-card__copy">
                  已匹配当前设备的升级通道，下载完成后会自动开始安装。
                </p>
                <button
                  type="button"
                  className="primary-download-button update-upgrade-button"
                  disabled={isUpgradeBusy(installState.phase)}
                  onClick={() => {
                    void handleUpgrade();
                  }}
                >
                  {getUpgradeButtonLabel(
                    installState.phase,
                    result.latestVersion
                  )}
                </button>
                <div className="update-progress-area">
                  <div
                    className={`update-progress-bar ${
                      isUpgradeBusy(installState.phase) ? "is-active" : ""
                    }`}
                    role="progressbar"
                    aria-label="升级进度"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={installState.progressPercent}
                  >
                    <span style={{ width: `${installState.progressPercent}%` }} />
                  </div>
                  <p>{getUpgradeStatusCopy(installState)}</p>
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
