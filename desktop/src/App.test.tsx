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
    expect(refreshIntervalButton).toHaveTextContent("3s");
    expect(within(tabs).getByRole("button", { name: "CPU" })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "内存" })).toBeInTheDocument();
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

  it("opens the confirm dialog after the desktop context menu emits terminate action", async () => {
    const showProcessContextMenu = vi.fn().mockResolvedValue(undefined);
    const listProcesses = vi.fn().mockResolvedValue(mockProcesses);
    let handleAction: ((action: { action: "terminate"; pid: number }) => void) | null = null;

    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses,
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
});
