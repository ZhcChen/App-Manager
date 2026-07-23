import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { mockProcesses } from "./features/processes/mockProcesses";
import { mockPorts } from "./features/ports/mockPorts";
import { App } from "./App";

const AUTO_REFRESH_INTERVAL_STORAGE_KEY = "app-manager:auto-refresh-interval";

describe("App", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
    const storage = new Map<string, string>();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem(key: string) {
          return storage.has(key) ? storage.get(key)! : null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        removeItem(key: string) {
          storage.delete(key);
        }
      }
    });
  });

  it("renders the shell header", () => {
    render(<App />);
    const tabs = screen.getByRole("navigation", { name: "监视视图" });
    const refreshIntervalButton = screen.getByRole("button", {
      name: "自动刷新间隔"
    });

    expect(screen.getByAltText("App Manager 标志")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "App Manager" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /当前版本 v/ })
    ).toBeInTheDocument();
    expect(refreshIntervalButton).toHaveTextContent("3s");
    expect(within(tabs).getByRole("button", { name: "CPU" })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "内存" })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "端口" })).toBeInTheDocument();
  });

  it("stores the selected refresh interval", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "自动刷新间隔" }));
    fireEvent.click(screen.getByRole("option", { name: "10s" }));

    expect(screen.getByRole("button", { name: "自动刷新间隔" })).toHaveTextContent("10s");
    expect(window.localStorage.getItem(AUTO_REFRESH_INTERVAL_STORAGE_KEY)).toBe("10000");
  });

  it("filters the mock list by search query", () => {
    render(<App />);
    const table = screen.getByRole("table", { name: "进程列表" });

    fireEvent.change(screen.getByLabelText("搜索进程"), {
      target: { value: "wechat" }
    });

    expect(within(table).getByText("WeChat")).toBeInTheDocument();
    expect(within(table).queryByText("Google Chrome")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("shows a query-specific empty state when nothing matches", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("搜索进程"), {
      target: { value: "not-exists" }
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "没有匹配的进程" })
    ).toBeInTheDocument();
  });

  it("filters the mock port list by search query after switching to the port tab", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "端口" }));

    fireEvent.change(screen.getByLabelText("搜索端口"), {
      target: { value: "1430" }
    });

    const table = screen.getByRole("table", { name: "端口列表" });

    expect(within(table).getByText("App Manager")).toBeInTheDocument();
    expect(within(table).queryByText("Visual Studio Code")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("falls back to the confirm dialog on right click when no desktop menu bridge exists", () => {
    render(<App />);

    fireEvent.contextMenu(screen.getByText("WeChat"), {
      clientX: 48,
      clientY: 32
    });

    const dialog = screen.getByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("WeChat");
  });

  it("keeps port loading failures scoped away from non-port tabs", async () => {
    const listProcesses = vi.fn().mockResolvedValue(mockProcesses);
    const listPorts = vi.fn().mockRejectedValue({
      code: "operation_failed",
      message: "port load failed"
    });

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses,
      listPorts,
      terminateProcess: vi.fn()
    };

    render(<App />);

    await waitFor(() => {
      expect(listProcesses).toHaveBeenCalledTimes(1);
      expect(listPorts).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("port load failed")).not.toBeInTheDocument();
  });

  it("opens the confirm dialog after the desktop context menu emits terminate action", async () => {
    const showProcessContextMenu = vi.fn().mockResolvedValue(undefined);
    const listProcesses = vi.fn().mockResolvedValue(mockProcesses);
    let handleAction: ((action: { action: "terminate"; pid: number }) => void) | null = null;

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses,
      listPorts: vi.fn().mockResolvedValue(mockPorts),
      terminateProcess: vi.fn(),
      showProcessContextMenu,
      onProcessContextAction(listener) {
        handleAction = listener;
        return vi.fn();
      }
    };

    render(<App />);

    await waitFor(() => {
      expect(listProcesses).toHaveBeenCalled();
    });

    fireEvent.contextMenu(screen.getByText("WeChat"), {
      clientX: 64,
      clientY: 40
    });

    expect(showProcessContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ pid: 2831, name: "WeChat" }),
      { x: 64, y: 40 }
    );

    await act(async () => {
      handleAction?.({ action: "terminate", pid: 2831 });
    });

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("WeChat");
  });

  it("refreshes the port list immediately after terminating a port owner", async () => {
    let currentProcesses = [...mockProcesses];
    let currentPorts = [...mockPorts];
    const listProcesses = vi.fn().mockImplementation(async () => currentProcesses);
    const listPorts = vi.fn().mockImplementation(async () => currentPorts);
    const terminateProcess = vi.fn().mockImplementation(async (pid: number) => {
      const target =
        currentProcesses.find((item) => item.pid === pid) ??
        currentPorts.find((item) => item.pid === pid);

      currentProcesses = currentProcesses.filter((item) => item.pid !== pid);
      currentPorts = currentPorts.filter((item) => item.pid !== pid);

      return {
        pid,
        name: target?.name ?? `PID ${pid}`
      };
    });

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses,
      listPorts,
      terminateProcess
    };

    render(<App />);

    await waitFor(() => {
      expect(listProcesses).toHaveBeenCalledTimes(1);
      expect(listPorts).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "端口" }));
    fireEvent.contextMenu(screen.getByText("WeChat"), {
      clientX: 52,
      clientY: 36
    });

    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "结束进程" }));

    await waitFor(() => {
      expect(terminateProcess).toHaveBeenCalledWith(2831);
      expect(listProcesses).toHaveBeenCalledTimes(2);
      expect(listPorts).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.queryByText("WeChat")).not.toBeInTheDocument();
    });
  });

  it("shows a port refresh error if the post-terminate refresh fails in the port view", async () => {
    const listProcesses = vi.fn().mockResolvedValue(mockProcesses);
    const listPorts = vi
      .fn()
      .mockResolvedValueOnce(mockPorts)
      .mockRejectedValueOnce({
        code: "operation_failed",
        message: "port refresh failed"
      });

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses,
      listPorts,
      terminateProcess: vi.fn().mockResolvedValue({
        pid: 2831,
        name: "WeChat"
      })
    };

    render(<App />);

    await waitFor(() => {
      expect(listProcesses).toHaveBeenCalledTimes(1);
      expect(listPorts).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "端口" }));
    fireEvent.contextMenu(screen.getByText("WeChat"), {
      clientX: 40,
      clientY: 28
    });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "结束进程" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("端口列表更新失败");
    expect(alert).toHaveTextContent("port refresh failed");
  });

  it("shows an update badge and opens the update dialog", async () => {
    const openUpdateDownload = vi.fn().mockResolvedValue(undefined);
    const updateAsset = {
      name: "App-Manager-0.1.11-mac-arm64.dmg",
      url: "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-mac-arm64.dmg",
      platform: "macos" as const,
      arch: "arm64" as const,
      format: "dmg" as const,
      isCurrentPlatform: true
    };

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses: vi.fn().mockResolvedValue(mockProcesses),
      listPorts: vi.fn().mockResolvedValue(mockPorts),
      terminateProcess: vi.fn(),
      openUpdateDownload,
      checkForUpdates: vi.fn().mockResolvedValue({
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
        assets: [updateAsset],
        currentPlatformAssets: [updateAsset]
      })
    };

    render(<App />);

    const versionButton = await screen.findByRole("button", {
      name: "当前版本 v0.1.10，发现新版本"
    });

    fireEvent.click(versionButton);

    const dialog = await screen.findByRole("dialog", {
      name: "发现新版本"
    });

    expect(dialog).toHaveTextContent("v0.1.10");
    expect(dialog).toHaveTextContent("v0.1.11");
    expect(dialog).toHaveTextContent("macOS arm64 · DMG");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "macOS arm64 · DMG" })
    );

    await waitFor(() => {
      expect(openUpdateDownload).toHaveBeenCalledWith(updateAsset.url);
    });
  });

  it("shows a toast when opening an update download fails", async () => {
    const updateAsset = {
      name: "App-Manager-0.1.11-mac-arm64.dmg",
      url: "https://github.com/ZhcChen/App-Manager/releases/download/v0.1.11/App-Manager-0.1.11-mac-arm64.dmg",
      platform: "macos" as const,
      arch: "arm64" as const,
      format: "dmg" as const,
      isCurrentPlatform: true
    };

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses: vi.fn().mockResolvedValue(mockProcesses),
      listPorts: vi.fn().mockResolvedValue(mockPorts),
      terminateProcess: vi.fn(),
      openUpdateDownload: vi.fn().mockRejectedValue({
        code: "open_download_failed",
        message: "Unable to open browser."
      }),
      checkForUpdates: vi.fn().mockResolvedValue({
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
        assets: [updateAsset],
        currentPlatformAssets: [updateAsset]
      })
    };

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "当前版本 v0.1.10，发现新版本"
      })
    );

    const dialog = await screen.findByRole("dialog", {
      name: "发现新版本"
    });

    fireEvent.click(
      within(dialog).getByRole("button", { name: "macOS arm64 · DMG" })
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("打开下载失败");
    expect(alert).toHaveTextContent("Unable to open browser.");
  });
});
