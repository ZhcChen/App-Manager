import type { CSSProperties } from "react";
import { AppTileIcon } from "@/components/icons";
import type { ProcessApiError } from "@/features/processes/types";
import type { ApplicationViewNode } from "../tree";

type ApplicationTreeProps = {
  items: ApplicationViewNode[];
  error: ProcessApiError | null;
  isLoading: boolean;
  query: string;
  selectedId: string | null;
  expandedIds: Set<string>;
  terminatingTargetId: string | null;
  onSelect: (node: ApplicationViewNode) => void;
  onToggle: (nodeId: string) => void;
  onOpenContextMenu: (
    node: ApplicationViewNode,
    position: {
      x: number;
      y: number;
    }
  ) => void;
  onRetry: () => void;
};

export function ApplicationTree(props: ApplicationTreeProps) {
  const {
    items,
    error,
    isLoading,
    query,
    selectedId,
    expandedIds,
    terminatingTargetId,
    onSelect,
    onToggle,
    onOpenContextMenu,
    onRetry
  } = props;
  const hasQuery = query.trim().length > 0;

  if (isLoading) {
    return (
      <div className="empty-state" role="status">
        <h3>正在载入应用</h3>
        <p>准备当前桌面会话的应用树数据。</p>
      </div>
    );
  }

  if (!items.length && error) {
    return (
      <div className="empty-state empty-state--error" role="alert">
        <h3>载入应用失败</h3>
        <p>{error.message}</p>
        <button
          type="button"
          className="secondary-button empty-state__action"
          onClick={onRetry}
        >
          重试
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty-state" role="status">
        <h3>{hasQuery ? "没有匹配的应用" : "当前没有可见应用"}</h3>
        <p>
          {hasQuery
            ? `没有找到“${query}”相关应用。`
            : "当前工作区没有可展示的应用分组。"}
        </p>
      </div>
    );
  }

  return (
    <div className="application-tree-wrap">
      <div className="application-tree" role="tree" aria-label="应用列表">
        <div className="application-tree__header" role="row">
          <span>应用名称</span>
          <span>范围</span>
          <span>PID</span>
          <span>用户</span>
          <span>状态</span>
        </div>
        <div className="application-tree__body">
          {items.map((item) =>
            renderNode({
              depth: 0,
              expandedIds,
              item,
              onOpenContextMenu,
              onSelect,
              onToggle,
              selectedId,
              terminatingTargetId
            })
          )}
        </div>
      </div>
    </div>
  );
}

function renderNode(props: {
  depth: number;
  expandedIds: Set<string>;
  item: ApplicationViewNode;
  selectedId: string | null;
  terminatingTargetId: string | null;
  onSelect: (node: ApplicationViewNode) => void;
  onToggle: (nodeId: string) => void;
  onOpenContextMenu: (
    node: ApplicationViewNode,
    position: {
      x: number;
      y: number;
    }
  ) => void;
}) {
  const {
    depth,
    expandedIds,
    item,
    onOpenContextMenu,
    onSelect,
    onToggle,
    selectedId,
    terminatingTargetId
  } = props;
  const expandable = item.kind !== "process" && item.children.length > 0;
  const expanded = expandable ? expandedIds.has(item.id) : false;
  const selected = selectedId === item.id;
  const busy = terminatingTargetId === item.id;

  return (
    <div key={item.id}>
      <div
        className={`application-tree__row ${selected ? "is-selected" : ""} ${
          busy ? "is-busy" : ""
        }`}
        role="treeitem"
        aria-expanded={expandable ? expanded : undefined}
        aria-selected={selected}
        style={{ "--tree-depth": String(depth) } as CSSProperties}
        onClick={() => onSelect(item)}
        onContextMenu={(event) => {
          event.preventDefault();
          onSelect(item);
          onOpenContextMenu(item, {
            x: event.clientX,
            y: event.clientY
          });
        }}
      >
        <div className="application-tree__cell application-tree__cell--name">
          <span
            className="application-tree__indent"
            style={{ width: `${depth * 16}px` }}
            aria-hidden="true"
          />
          {expandable ? (
            <button
              type="button"
              className={`application-tree__expander ${expanded ? "is-open" : ""}`}
              aria-label={`${expanded ? "折叠" : "展开"} ${item.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(item.id);
              }}
            >
              <span aria-hidden="true" />
            </button>
          ) : (
            <span className="application-tree__expander-spacer" aria-hidden="true" />
          )}

          <div className="process-cell__icon" aria-hidden="true">
            <AppTileIcon />
          </div>
          <div className="process-cell__content">
            <strong>{item.name}</strong>
            <span>{item.path || "—"}</span>
          </div>
        </div>

        <div className="application-tree__cell">
          <span className={busy ? "metric-busy" : undefined}>
            {formatScope(item)}
          </span>
        </div>
        <div className="application-tree__cell">
          <span className={busy ? "metric-busy" : undefined}>
            {item.pid ?? "—"}
          </span>
        </div>
        <div className="application-tree__cell">
          <span className={busy ? "metric-busy" : undefined}>
            {item.userName || "—"}
          </span>
        </div>
        <div className="application-tree__cell application-tree__cell--status">
          <span className={`status-badge status-badge--${item.status}`}>
            {item.status === "protected" ? "受保护" : "运行中"}
          </span>
        </div>
      </div>

      {expandable && expanded
        ? item.children.map((child) =>
            renderNode({
              depth: depth + 1,
              expandedIds,
              item: child,
              onOpenContextMenu,
              onSelect,
              onToggle,
              selectedId,
              terminatingTargetId
            })
          )
        : null}
    </div>
  );
}

function formatScope(item: ApplicationViewNode) {
  switch (item.kind) {
    case "application":
      return `${item.instanceCount} 个实例 / ${item.processCount} 个进程`;
    case "instance":
      return `实例 / ${item.processCount} 个进程`;
    case "process":
      return item.kindLabel;
  }
}
