import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockApplications } from "../mockApplications";
import { buildApplicationViewTree } from "../tree";
import { ApplicationTree } from "./ApplicationTree";

describe("ApplicationTree", () => {
  it("toggles nested instance rows", () => {
    const items = buildApplicationViewTree(mockApplications);
    const expandedIds = new Set<string>(["application:chrome-for-testing"]);
    const onToggle = vi.fn();

    render(
      <ApplicationTree
        items={items}
        error={null}
        isLoading={false}
        query=""
        selectedId={items[0]?.id ?? null}
        expandedIds={expandedIds}
        terminatingTargetId={null}
        onSelect={vi.fn()}
        onToggle={onToggle}
        onOpenContextMenu={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.queryByText("Chrome Helper (Renderer)")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "展开 Chrome for Testing" })[0]!);

    expect(onToggle).toHaveBeenCalledWith("instance:chrome-for-testing:1540:1");
  });

  it("opens the row context menu with the clicked node position", () => {
    const items = buildApplicationViewTree(mockApplications);
    const onSelect = vi.fn();
    const onOpenContextMenu = vi.fn();

    render(
      <ApplicationTree
        items={items}
        error={null}
        isLoading={false}
        query=""
        selectedId={null}
        expandedIds={new Set<string>()}
        terminatingTargetId={null}
        onSelect={onSelect}
        onToggle={vi.fn()}
        onOpenContextMenu={onOpenContextMenu}
        onRetry={vi.fn()}
      />
    );

    fireEvent.contextMenu(screen.getByText("WeChat"), {
      clientX: 72,
      clientY: 28
    });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "application:wechat",
        kind: "application"
      })
    );
    expect(onOpenContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "application:wechat",
        kind: "application"
      }),
      { x: 72, y: 28 }
    );
  });
});
