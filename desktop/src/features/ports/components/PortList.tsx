import type { ProcessApiError } from "@/features/processes/types";
import { AppTileIcon } from "../../../components/icons";
import type { PortBindingItem } from "../types";
import type {
  PortColumn,
  PortSortKey
} from "../view-config";
import { formatPortMetricValue } from "../view-config";
import type { SortDirection } from "@/features/processes/view-config";

type PortListProps = {
  items: PortBindingItem[];
  columns: PortColumn[];
  error: ProcessApiError | null;
  isLoading: boolean;
  query: string;
  selectedId: string | null;
  sortKey: PortSortKey;
  sortDirection: SortDirection;
  terminatingPid: number | null;
  onSelect: (item: PortBindingItem) => void;
  onOpenContextMenu: (
    item: PortBindingItem,
    position: {
      x: number;
      y: number;
    }
  ) => void;
  onSortChange: (key: PortSortKey) => void;
  onRetry: () => void;
};

export function PortList(props: PortListProps) {
  const {
    items,
    columns,
    error,
    isLoading,
    query,
    selectedId,
    sortKey,
    sortDirection,
    terminatingPid,
    onSelect,
    onOpenContextMenu,
    onSortChange,
    onRetry
  } = props;
  const hasQuery = query.trim().length > 0;

  if (isLoading) {
    return (
      <div className="empty-state" role="status">
        <h3>正在载入端口</h3>
        <p>准备当前桌面会话的端口占用数据。</p>
      </div>
    );
  }

  if (!items.length && error) {
    return (
      <div className="empty-state empty-state--error" role="alert">
        <h3>载入端口失败</h3>
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
        <h3>{hasQuery ? "没有匹配的端口" : "当前没有监听端口"}</h3>
        <p>
          {hasQuery
            ? `没有找到“${query}”相关端口。`
            : "当前会话没有发现可展示的监听端口占用。"}
        </p>
      </div>
    );
  }

  return (
    <div className="process-table-wrap">
      <table className="process-table" aria-label="端口列表">
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sortKey === column.key;

              return (
                <th
                  key={column.key}
                  className={column.align === "end" ? "align-end" : undefined}
                  scope="col"
                >
                  <button
                    type="button"
                    className="column-sort-button"
                    onClick={() => onSortChange(column.key)}
                  >
                    <span>{column.label}</span>
                    <span className="sort-indicator" aria-hidden="true">
                      {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = selectedId === item.id;

            return (
              <tr
                key={item.id}
                className={selected ? "is-selected" : undefined}
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
                {columns.map((column) => {
                  if (column.key === "localPort") {
                    return (
                      <td
                        key={column.key}
                        className={column.align === "end" ? "align-end" : undefined}
                      >
                        <div className="port-cell__binding">
                          <strong>{item.localPort}</strong>
                        </div>
                      </td>
                    );
                  }

                  if (column.key === "name") {
                    return (
                      <td key={column.key}>
                        <div className="process-cell__identity">
                          <div className="process-cell__icon" aria-hidden="true">
                            <AppTileIcon />
                          </div>
                          <div className="process-cell__content">
                            <strong>{item.name}</strong>
                            <span>{item.path || "—"}</span>
                          </div>
                        </div>
                      </td>
                    );
                  }

                  if (column.key === "protocol") {
                    return (
                      <td key={column.key}>
                        <span className={`protocol-chip protocol-chip--${item.protocol}`}>
                          {formatPortMetricValue(item, column.key)}
                        </span>
                      </td>
                    );
                  }

                  if (column.key === "status") {
                    return (
                      <td
                        key={column.key}
                        className={column.align === "end" ? "align-end" : undefined}
                      >
                        <span className={`status-badge status-badge--${item.status}`}>
                          {formatPortMetricValue(item, column.key)}
                        </span>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={column.key}
                      className={column.align === "end" ? "align-end" : undefined}
                    >
                      <span
                        className={terminatingPid === item.pid ? "metric-busy" : undefined}
                      >
                        {formatPortMetricValue(item, column.key)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
