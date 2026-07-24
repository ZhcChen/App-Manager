import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app, ipcMain, shell } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import {
  checkForUpdates,
  compareVersions,
  isAllowedDownloadUrl,
  registerUpdateHandlers,
  releasePageToResult
} from "./updates.cjs";

vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn(() => "0.1.10")
  },
  ipcMain: {
    handle: vi.fn()
  },
  shell: {
    openExternal: vi.fn()
  }
}));

const releaseAsset = {
  name: "App-Manager-0.1.11-mac-arm64.dmg",
  browser_download_url:
    "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-mac-arm64.dmg"
};

const releasePageHtml = `
  <html>
    <head>
      <meta property="og:url" content="/ZhcChen/App-Manager/releases/tag/v0.1.11" />
    </head>
    <body>
      <relative-time datetime="2026-07-23T00:00:00Z"></relative-time>
      <li><a href="https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-mac-arm64.dmg">DMG</a></li>
      <li><a href="https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-win-x64.exe">EXE</a></li>
      <li><a href="https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-linux-x64.AppImage">AppImage</a></li>
    </body>
  </html>
`;

function getRegisteredHandler(channel: string) {
  const match = vi
    .mocked(ipcMain.handle)
    .mock.calls.find(([registeredChannel]) => registeredChannel === channel);

  if (!match) {
    throw new Error(`Missing IPC handler for ${channel}.`);
  }

  return match[1] as (...args: unknown[]) => Promise<unknown>;
}

describe("update IPC helpers", () => {
  beforeEach(() => {
    vi.mocked(app.getVersion).mockReturnValue("0.1.10");
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(shell.openExternal).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("compares stable releases above prerelease builds", () => {
    expect(compareVersions("0.1.11", "0.1.11-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("0.1.11-rc.2", "0.1.11-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("0.1.11-rc.1", "0.1.11")).toBeLessThan(0);
  });

  it("parses a valid GitHub release page into update assets", () => {
    const result = releasePageToResult({
      html: releasePageHtml,
      finalUrl: "https://github.com/ZhcChen/App-Manager/releases/tag/v0.1.11"
    });

    expect(result).toMatchObject({
      currentVersion: "0.1.10",
      latestVersion: "0.1.11",
      latestTag: "v0.1.11",
      hasUpdate: true,
      publishedAt: "2026-07-23T00:00:00Z"
    });
    expect(result.assets).toHaveLength(3);
    expect(result.assets[0]).toMatchObject({
      platform: "macos",
      arch: "arm64",
      format: "dmg"
    });
  });

  it("rejects malformed GitHub release pages", () => {
    expect(() =>
      releasePageToResult({
        html: "<html></html>",
        finalUrl: "https://github.com/ZhcChen/App-Manager/releases/latest"
      })
    ).toThrow(
      "missing tag_name"
    );
    expect(() =>
      releasePageToResult({
        html: '<meta property="og:url" content="/ZhcChen/App-Manager/releases/tag/v0.1.11" />',
        finalUrl: "https://github.com/ZhcChen/App-Manager/releases/tag/v0.1.11"
      })
    ).toThrow(
      "missing assets"
    );
  });

  it("only allows release download URLs from the expected GitHub repository", () => {
    expect(isAllowedDownloadUrl(releaseAsset.browser_download_url)).toBe(true);
    expect(
      isAllowedDownloadUrl(
        "https://github.com.evil/ZhcChen/App-Manager/releases/download/v0.1.11/file.dmg"
      )
    ).toBe(false);
    expect(
      isAllowedDownloadUrl(
        "http://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/file.dmg"
      )
    ).toBe(false);
  });

  it("returns a standard IPC error when update checks time out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      })
    );
    registerUpdateHandlers();

    const handler = getRegisteredHandler(DESKTOP_CHANNELS.checkForUpdates);
    const resultPromise = handler();

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      error: {
        code: "update_check_failed",
        message: "GitHub release page request timed out."
      }
    });
  });

  it("opens allowed download URLs and normalizes failures", async () => {
    vi.mocked(shell.openExternal).mockRejectedValue(new Error("open failed"));
    registerUpdateHandlers();

    const handler = getRegisteredHandler(DESKTOP_CHANNELS.openUpdateDownload);

    await expect(
      handler({}, releaseAsset.browser_download_url)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "open_download_failed",
        message: "open failed"
      }
    });
    await expect(
      handler({}, "https://example.com/file.dmg")
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_download_url"
      }
    });
  });

  it("fetches the latest GitHub release page with an abort signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        url: "https://github.com/ZhcChen/App-Manager/releases/tag/v0.1.11",
        text: vi.fn().mockResolvedValue(releasePageHtml)
      })
    );

    await expect(checkForUpdates()).resolves.toMatchObject({
      latestVersion: "0.1.11",
      hasUpdate: true
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://github.com/ZhcChen/App-Manager/releases/latest",
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    );
  });
});
