import { fireEvent, render, screen } from "@testing-library/react";
import { PortList } from "./PortList";
import type { PortBindingItem } from "../types";
import { PORT_VIEW_CONFIG } from "../view-config";

const items: PortBindingItem[] = [
  {
    id: "tcp:127.0.0.1:3000:9012",
    pid: 9012,
    name: "Visual Studio Code",
    path: "/Applications/Visual Studio Code.app",
    userName: "chen",
    localAddress: "127.0.0.1",
    localPort: 3000,
    protocol: "tcp",
    status: "running",
    canTerminate: true
  },
  {
    id: "tcp:127.0.0.1:1430:5188",
    pid: 5188,
    name: "App Manager",
    path: "/Applications/App Manager.app",
    userName: "chen",
    localAddress: "127.0.0.1",
    localPort: 1430,
    protocol: "tcp",
    status: "protected",
    canTerminate: false
  }
];

describe("PortList", () => {
  it("renders an empty error state when no data is available", () => {
    render(
      <PortList
        items={[]}
        columns={PORT_VIEW_CONFIG.columns}
        error={{ code: "operation_failed", message: "load failed" }}
        isLoading={false}
        query=""
        selectedId={null}
        sortKey="localPort"
        sortDirection="asc"
        terminatingPid={null}
        onSelect={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "载入端口失败" })
    ).toBeInTheDocument();
    expect(screen.getByText("load failed")).toBeInTheDocument();
  });

  it("renders rows and allows selecting a port binding", () => {
    const onSelect = vi.fn();

    render(
      <PortList
        items={items}
        columns={PORT_VIEW_CONFIG.columns}
        error={null}
        isLoading={false}
        query=""
        selectedId={items[0].id}
        sortKey="localPort"
        sortDirection="asc"
        terminatingPid={null}
        onSelect={onSelect}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("App Manager"));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(screen.getByText("3000")).toBeInTheDocument();
  });

  it("opens the row context menu with the clicked binding position", () => {
    const onSelect = vi.fn();
    const onOpenContextMenu = vi.fn();

    render(
      <PortList
        items={items}
        columns={PORT_VIEW_CONFIG.columns}
        error={null}
        isLoading={false}
        query=""
        selectedId={items[0].id}
        sortKey="localPort"
        sortDirection="asc"
        terminatingPid={null}
        onSelect={onSelect}
        onOpenContextMenu={onOpenContextMenu}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    fireEvent.contextMenu(screen.getByText("Visual Studio Code"), {
      clientX: 88,
      clientY: 46
    });

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onOpenContextMenu).toHaveBeenCalledWith(items[0], {
      x: 88,
      y: 46
    });
  });

  it("renders query-specific empty copy", () => {
    render(
      <PortList
        items={[]}
        columns={PORT_VIEW_CONFIG.columns}
        error={null}
        isLoading={false}
        query="1430"
        selectedId={null}
        sortKey="localPort"
        sortDirection="asc"
        terminatingPid={null}
        onSelect={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onSortChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "没有匹配的端口" })
    ).toBeInTheDocument();
    expect(screen.getByText("没有找到“1430”相关端口。")).toBeInTheDocument();
  });
});
