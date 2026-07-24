import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpdateDialog } from "./UpdateDialog";
import type { UpdateCheckResult } from "../types";

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

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve
  };
}

describe("UpdateDialog", () => {
  it("stays hidden when closed", () => {
    render(
      <UpdateDialog
        isOpen={false}
        result={result}
        error={null}
        isChecking={false}
        onClose={vi.fn()}
        onCheckNow={vi.fn()}
        onOpenDownload={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders only the current platform update and opens it with progress", async () => {
    const deferred = createDeferred();
    const onOpenDownload = vi.fn().mockReturnValue(deferred.promise);

    render(
      <UpdateDialog
        isOpen
        result={result}
        error={null}
        isChecking={false}
        onClose={vi.fn()}
        onCheckNow={vi.fn()}
        onOpenDownload={onOpenDownload}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "发现新版本" });

    expect(dialog).toHaveTextContent("v0.1.10");
    expect(dialog).toHaveTextContent("v0.1.11");
    expect(dialog).toHaveTextContent("当前设备");
    expect(dialog).toHaveTextContent("macOS arm64");
    expect(dialog).not.toHaveTextContent("Windows");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "升级到 v0.1.11" })
    );

    expect(onOpenDownload).toHaveBeenCalledWith(asset.url);
    expect(within(dialog).getByRole("progressbar", { name: "升级进度" }))
      .toHaveAttribute("aria-valuenow", "18");
    expect(within(dialog).getByRole("button", { name: "正在升级..." }))
      .toBeDisabled();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(within(dialog).getByRole("progressbar", { name: "升级进度" }))
      .toHaveAttribute("aria-valuenow", "100");
    expect(dialog).toHaveTextContent("已打开下载页面");
  });

  it("shows a neutral title before the first update result arrives", () => {
    render(
      <UpdateDialog
        isOpen
        result={null}
        error={null}
        isChecking
        onClose={vi.fn()}
        onCheckNow={vi.fn()}
        onOpenDownload={vi.fn()}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "正在检测更新" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "检测中..." })).toBeDisabled();
  });
});
