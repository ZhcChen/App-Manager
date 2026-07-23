import type { UpdateCheckResult, UpdatePlatform, UpdateReleaseAsset } from "../types";

type UpdateDialogProps = {
  isOpen: boolean;
  result: UpdateCheckResult | null;
  error: string | null;
  isChecking: boolean;
  onClose: () => void;
  onCheckNow: () => void;
  onOpenDownload: (url: string) => void;
};

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

function groupAssetsByPlatform(assets: UpdateReleaseAsset[]) {
  return assets.reduce<Record<string, UpdateReleaseAsset[]>>((groups, asset) => {
    const key = asset.platform;
    groups[key] = groups[key] ?? [];
    groups[key].push(asset);
    return groups;
  }, {});
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

export function UpdateDialog(props: UpdateDialogProps) {
  const {
    isOpen,
    result,
    error,
    isChecking,
    onClose,
    onCheckNow,
    onOpenDownload
  } = props;

  if (!isOpen) {
    return null;
  }

  const currentAssets = result?.currentPlatformAssets ?? [];
  const groupedAssets = groupAssetsByPlatform(result?.assets ?? []);
  const dialogTitle = getDialogTitle(result, error, isChecking);

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
            <strong>v{result?.currentVersion ?? "--"}</strong>
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

        {result?.hasUpdate && currentAssets.length ? (
          <div className="update-section">
            <h3>当前系统推荐下载</h3>
            <div className="update-download-list">
              {currentAssets.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  className="primary-download-button"
                  onClick={() => onOpenDownload(asset.url)}
                >
                  {formatAssetLabel(asset)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {result?.assets.length ? (
          <div className="update-section">
            <h3>所有平台下载</h3>
            <div className="update-platform-grid">
              {Object.entries(groupedAssets).map(([platform, assets]) => (
                <div key={platform} className="update-platform-card">
                  <strong>{PLATFORM_LABELS[platform as UpdatePlatform]}</strong>
                  {assets.map((asset) => (
                    <button
                      key={asset.url}
                      type="button"
                      className="text-button update-link-button"
                      onClick={() => onOpenDownload(asset.url)}
                    >
                      {asset.arch} · {FORMAT_LABELS[asset.format] ?? asset.format}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
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
