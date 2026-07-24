import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_CHANNELS } from "./channels.cjs";

const {
  appMock,
  browserWindowMock,
  ipcMainMock,
  sendMock,
  updaterMock
} = vi.hoisted(() => {
  const send = vi.fn();
  const listeners = new Map();
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on(event: string, listener: (...args: unknown[]) => void) {
      const current = listeners.get(event) ?? [];
      current.push(listener);
      listeners.set(event, current);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      const current = listeners.get(event) ?? [];
      for (const listener of current) {
        listener(...args);
      }
      return current.length > 0;
    },
    removeAllListeners() {
      listeners.clear();
      return this;
    }
  };

  return {
    appMock: {
      getVersion: vi.fn(() => "0.1.10"),
      isPackaged: true
    },
    browserWindowMock: {
      getAllWindows: vi.fn(() => [
        {
          isDestroyed: () => false,
          webContents: { send }
        }
      ])
    },
    ipcMainMock: {
      handle: vi.fn()
    },
    sendMock: send,
    updaterMock: updater
  };
});

vi.mock("electron", () => ({
  app: appMock,
  BrowserWindow: browserWindowMock,
  ipcMain: ipcMainMock
}));

vi.mock("electron-updater", () => ({
  autoUpdater: updaterMock
}));

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
    .mocked(ipcMainMock.handle)
    .mock.calls.find(([registeredChannel]) => registeredChannel === channel);

  if (!match) {
    throw new Error(`Missing IPC handler for ${channel}.`);
  }

  return match[1] as (...args: unknown[]) => Promise<unknown>;
}

async function loadUpdatesModule() {
  return await import("./updates.cjs");
}

describe("update IPC helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(appMock.getVersion).mockReturnValue("0.1.10");
    appMock.isPackaged = true;
    vi.mocked(browserWindowMock.getAllWindows).mockImplementation(() => [
      {
        isDestroyed: () => false,
        webContents: { send: sendMock }
      }
    ]);
    vi.mocked(ipcMainMock.handle).mockReset();
    sendMock.mockReset();
    updaterMock.removeAllListeners();
    updaterMock.checkForUpdates.mockReset();
    updaterMock.downloadUpdate.mockReset();
    updaterMock.quitAndInstall.mockReset();
    updaterMock.autoDownload = true;
    updaterMock.autoInstallOnAppQuit = true;
    delete process.env.APP_MANAGER_CHANNEL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("compares stable releases above prerelease builds", async () => {
    const { compareVersions } = await loadUpdatesModule();

    expect(compareVersions("0.1.11", "0.1.11-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("0.1.11-rc.2", "0.1.11-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("0.1.11-rc.1", "0.1.11")).toBeLessThan(0);
  });

  it("parses a valid GitHub release page into update assets", async () => {
    const { releasePageToResult } = await loadUpdatesModule();

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

  it("rejects malformed GitHub release pages", async () => {
    const { releasePageToResult } = await loadUpdatesModule();

    expect(() =>
      releasePageToResult({
        html: "<html></html>",
        finalUrl: "https://github.com/ZhcChen/App-Manager/releases/latest"
      })
    ).toThrow("missing tag_name");
    expect(() =>
      releasePageToResult({
        html: '<meta property="og:url" content="/ZhcChen/App-Manager/releases/tag/v0.1.11" />',
        finalUrl: "https://github.com/ZhcChen/App-Manager/releases/tag/v0.1.11"
      })
    ).toThrow("missing assets");
  });

  it("only allows release download URLs from the expected GitHub repository", async () => {
    const { isAllowedDownloadUrl } = await loadUpdatesModule();

    expect(
      isAllowedDownloadUrl(
        "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/file.dmg"
      )
    ).toBe(true);
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

    const { registerUpdateHandlers } = await loadUpdatesModule();
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

  it("starts in-app update downloads and broadcasts progress", async () => {
    updaterMock.checkForUpdates.mockImplementation(async () => {
      updaterMock.emit("checking-for-update");
      updaterMock.emit("update-available", { version: "0.1.11" });
      return {
        isUpdateAvailable: true,
        updateInfo: {
          version: "0.1.11"
        }
      };
    });
    updaterMock.downloadUpdate.mockImplementation(async () => {
      updaterMock.emit("download-progress", {
        percent: 46.2,
        transferred: 462,
        total: 1_000,
        bytesPerSecond: 128
      });
      return [];
    });

    const { registerUpdateHandlers } = await loadUpdatesModule();
    registerUpdateHandlers();

    const handler = getRegisteredHandler(DESKTOP_CHANNELS.startUpdateInstall);

    await expect(handler()).resolves.toMatchObject({
      ok: true,
      data: null
    });

    expect(updaterMock.autoDownload).toBe(false);
    expect(updaterMock.autoInstallOnAppQuit).toBe(false);
    expect(updaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(updaterMock.downloadUpdate).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      DESKTOP_CHANNELS.updateInstallStateChanged,
      expect.objectContaining({
        phase: "downloading",
        version: "0.1.11",
        progressPercent: 46
      })
    );
  });

  it("reports current install state through IPC", async () => {
    updaterMock.checkForUpdates.mockResolvedValue({
      isUpdateAvailable: true,
      updateInfo: {
        version: "0.1.11"
      }
    });
    updaterMock.downloadUpdate.mockImplementation(async () => {
      updaterMock.emit("download-progress", {
        percent: 91.4,
        transferred: 914,
        total: 1_000,
        bytesPerSecond: 256
      });
      return [];
    });

    const { registerUpdateHandlers } = await loadUpdatesModule();
    registerUpdateHandlers();

    const startHandler = getRegisteredHandler(DESKTOP_CHANNELS.startUpdateInstall);
    const stateHandler = getRegisteredHandler(DESKTOP_CHANNELS.getUpdateInstallState);

    await startHandler();

    await expect(stateHandler()).resolves.toMatchObject({
      ok: true,
      data: expect.objectContaining({
        phase: "downloading",
        progressPercent: 91
      })
    });
  });

  it("returns a standard IPC error when install start is unavailable in dev runtime", async () => {
    appMock.isPackaged = false;

    const { registerUpdateHandlers } = await loadUpdatesModule();
    registerUpdateHandlers();

    const handler = getRegisteredHandler(DESKTOP_CHANNELS.startUpdateInstall);

    await expect(handler()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "update_install_failed",
        message: "Dev 环境不支持应用内升级安装。"
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

    const { checkForUpdates } = await loadUpdatesModule();

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
