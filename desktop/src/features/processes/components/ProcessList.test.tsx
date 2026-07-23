import { fireEvent, render, screen } from "@testing-library/react";
import { ProcessList } from "./ProcessList";
import type { ProcessItem } from "../types";
import { PROCESS_VIEW_CONFIG } from "../view-config";

const items: ProcessItem[] = [
  {
    pid: 1824,
    name: "Google Chrome",
    path: "/Applications/Google Chrome.app",
    userName: "chen",
    kindLabel: "App",
    cpuUsagePercent: 12.3,
    memoryBytes: 932_184_064,
    virtualMemoryBytes: 5_812_314_112,
    runTimeSeconds: 16_422,
    startTimeSeconds: 1_721_726_000,
    diskReadBytes: 314_572_800,
    diskWrittenBytes: 125_829_120,
    status: "running",
    canTerminate: true
  },
  {
    pid: 5188,
    name: "App Manager",
    path: "/Applications/App Manager.app",
    userName: "chen",
    kindLabel: "工具",
    cpuUsagePercent: 0.9,
    memoryBytes: 92_274_688,
    virtualMemoryBytes: 412_090_368,
    runTimeSeconds: 1_220,
    startTimeSeconds: 1_721_730_500,
    diskReadBytes: 1_572_864,
    diskWrittenBytes: 1_048_576,
    status: "protected",
    canTerminate: false
  }
];

describe("ProcessList", () => {
  it("renders an empty error state when no data is available", () => {
    render(
      <ProcessList
        items={[]}
        columns={PROCESS_VIEW_CONFIG.cpu.columns}
        error={{ code: "operation_failed", message: "load failed" }}
        isLoading={false}
        query=""
        selectedPid={null}
        sortKey="cpuUsagePercent"
        sortDirection="desc"
        terminatingPid={null}
        onSelect={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "载入进程失败" })
    ).toBeInTheDocument();
    expect(screen.getByText("load failed")).toBeInTheDocument();
  });

  it("renders rows and allows selecting a process", () => {
    const onSelect = vi.fn();

    render(
      <ProcessList
        items={items}
        columns={PROCESS_VIEW_CONFIG.cpu.columns}
        error={null}
        isLoading={false}
        query=""
        selectedPid={1824}
        sortKey="cpuUsagePercent"
        sortDirection="desc"
        terminatingPid={null}
        onSelect={onSelect}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("App Manager"));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(screen.getByText("12.3%")).toBeInTheDocument();
  });

  it("opens the row context menu with the clicked process position", () => {
    const onSelect = vi.fn();
    const onOpenContextMenu = vi.fn();

    render(
      <ProcessList
        items={items}
        columns={PROCESS_VIEW_CONFIG.cpu.columns}
        error={null}
        isLoading={false}
        query=""
        selectedPid={1824}
        sortKey="cpuUsagePercent"
        sortDirection="desc"
        terminatingPid={null}
        onSelect={onSelect}
        onOpenContextMenu={onOpenContextMenu}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    fireEvent.contextMenu(screen.getByText("Google Chrome"), {
      clientX: 72,
      clientY: 44
    });

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onOpenContextMenu).toHaveBeenCalledWith(items[0], {
      x: 72,
      y: 44
    });
  });

  it("renders query-specific empty copy", () => {
    render(
      <ProcessList
        items={[]}
        columns={PROCESS_VIEW_CONFIG.cpu.columns}
        error={null}
        isLoading={false}
        query="slack"
        selectedPid={null}
        sortKey="cpuUsagePercent"
        sortDirection="desc"
        terminatingPid={null}
        onSelect={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "没有匹配的进程" })
    ).toBeInTheDocument();
    expect(screen.getByText("没有找到“slack”相关进程。")).toBeInTheDocument();
  });
});
