import { fireEvent, render, screen, within } from "@testing-library/react";
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
  assets: [asset],
  currentPlatformAssets: [asset]
};

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

  it("renders update details and opens the selected download", () => {
    const onOpenDownload = vi.fn();

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

    fireEvent.click(
      within(dialog).getByRole("button", { name: "macOS arm64 · DMG" })
    );

    expect(onOpenDownload).toHaveBeenCalledWith(asset.url);
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
