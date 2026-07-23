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

describe("App", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
  });

  it("renders the shell header", () => {
    render(<App />);
    const tabs = screen.getByRole("navigation", { name: "监视视图" });

    expect(screen.getByAltText("App Manager 标志")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "App Manager" })
    ).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "CPU" })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "内存" })).toBeInTheDocument();
  });

  it("filters the mock list by search query", () => {
    render(<App />);
    const table = screen.getByRole("table", { name: "进程列表" });

    fireEvent.change(screen.getByLabelText("搜索进程"), {
      target: { value: "wechat" }
    });

    expect(within(table).getByText("WeChat")).toBeInTheDocument();
    expect(within(table).queryByText("Google Chrome")).not.toBeInTheDocument();
    expect(
      screen.getByText(/已筛选 1 \/ 5 个进程/, {
        selector: ".monitor-toolbar__overview-copy p"
      })
    ).toBeInTheDocument();
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
