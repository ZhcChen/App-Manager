import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpdateDialog } from "./UpdateDialog";
import type { UpdateCheckResult, UpdateInstallState } from "../types";
import { createIdleUpdateInstallState } from "../types";

const asset = {
  name: "App-Manager-0.1.11-mac-arm64.dmg",
  url: "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-mac-arm64.dmg",
  platform: "macos",
  arch: "arm64",
  format: "dmg",
  isCurrentPlatform: true
} as const;

const windowsAsset = {
  name: "App-Manager-0.1.11-win-x64.exe",
  url: "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-win-x64.exe",
  platform: "windows",
  arch: "x64",
  format: "exe",
  isCurrentPlatform: false
} as const;

const result: UpdateCheckResult = {
  currentVersion: "0.1.10",
  latestVersion: "0.1.11",
  latestTag: "v0.1.11",
  hasUpdate: true,
  releaseName: "App Manager v0.1.11",
  releaseUrl: "https://github.com/ZhcChen/App-Manager/releases/tag/v0.1.11",
  releaseNotes: "",
  publishedAt: "2026-07-23T00:00:00Z",
  checkedAt: "2026-07-23T00:00:00Z",
  currentPlatform: "macos",
  currentArch: "arm64",
  assets: [asset, windowsAsset],
  currentPlatformAssets: [asset]
};

function renderDialog(installState: UpdateInstallState) {
  const onStartInstall = vi.fn().mockResolvedValue(undefined);

  render(
    <UpdateDialog
      isOpen
      currentVersion="0.1.10"
      result={result}
      error={null}
      isChecking={false}
      installState={installState}
      onClose={vi.fn()}
      onCheckNow={vi.fn()}
      onStartInstall={onStartInstall}
    />
  );

  return {
    onStartInstall,
    dialog: screen.getByRole("dialog", { name: "发现新版本" })
  };
}

describe("UpdateDialog", () => {
  it("stays hidden when closed", () => {
    render(
      <UpdateDialog
        isOpen={false}
        currentVersion="0.1.10"
        result={result}
        error={null}
        isChecking={false}
        installState={createIdleUpdateInstallState()}
        onClose={vi.fn()}
        onCheckNow={vi.fn()}
        onStartInstall={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders only the current platform update and starts install flow", () => {
    const { dialog, onStartInstall } = renderDialog(createIdleUpdateInstallState());

    expect(dialog).toHaveTextContent("v0.1.10");
    expect(dialog).toHaveTextContent("v0.1.11");
    expect(dialog).toHaveTextContent("当前设备");
    expect(dialog).toHaveTextContent("macOS arm64");
    expect(dialog).not.toHaveTextContent("Windows");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "升级到 v0.1.11" })
    );

    expect(onStartInstall).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveTextContent("下载完成后会自动开始安装");
  });

  it("shows real progress and disables the action while downloading", () => {
    const { dialog } = renderDialog({
      phase: "downloading",
      version: "0.1.11",
      progressPercent: 64,
      transferredBytes: 640,
      totalBytes: 1_000,
      bytesPerSecond: 128,
      message: "正在下载更新..."
    });

    expect(within(dialog).getByRole("progressbar", { name: "升级进度" }))
      .toHaveAttribute("aria-valuenow", "64");
    expect(within(dialog).getByRole("button", { name: "正在下载..." }))
      .toBeDisabled();
    expect(dialog).toHaveTextContent("正在下载更新...");
  });

  it("shows install state after the package is downloaded", () => {
    const { dialog } = renderDialog({
      phase: "installing",
      version: "0.1.11",
      progressPercent: 100,
      transferredBytes: 1_000,
      totalBytes: 1_000,
      bytesPerSecond: null,
      message: "正在启动安装程序，应用即将退出..."
    });

    expect(within(dialog).getByRole("progressbar", { name: "升级进度" }))
      .toHaveAttribute("aria-valuenow", "100");
    expect(within(dialog).getByRole("button", { name: "正在安装..." }))
      .toBeDisabled();
    expect(dialog).toHaveTextContent("应用即将退出");
  });

  it("shows a neutral title before the first update result arrives", () => {
    render(
      <UpdateDialog
        isOpen
        currentVersion="0.1.10"
        result={null}
        error={null}
        isChecking
        installState={createIdleUpdateInstallState()}
        onClose={vi.fn()}
        onCheckNow={vi.fn()}
        onStartInstall={vi.fn()}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "正在检测更新" })
    ).toBeInTheDocument();
    expect(screen.getByText("v0.1.10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "检测中..." })).toBeDisabled();
  });
});
