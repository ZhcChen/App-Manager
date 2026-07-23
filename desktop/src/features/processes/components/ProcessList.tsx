import type { ProcessApiError, ProcessItem } from "../types";
import type { ProcessColumn, ProcessSortKey, SortDirection } from "../view-config";
import { formatMetricValue } from "../view-config";
import { AppTileIcon } from "../../../components/icons";

type ProcessListProps = {
  items: ProcessItem[];
  columns: ProcessColumn[];
  error: ProcessApiError | null;
  isLoading: boolean;
  query: string;
  selectedPid: number | null;
  sortKey: ProcessSortKey;
  sortDirection: SortDirection;
  terminatingPid: number | null;
  onSelect: (item: ProcessItem) => void;
  onSortChange: (key: ProcessSortKey) => void;
  onRetry: () => void;
};

export function ProcessList(props: ProcessListProps) {
  const {
    items,
    columns,
    error,
    isLoading,
    query,
    selectedPid,
    sortKey,
    sortDirection,
    terminatingPid,
    onSelect,
    onSortChange,
    onRetry
  } = props;
  const hasQuery = query.trim().length > 0;

  if (isLoading) {
    return (
      <div className="empty-state" role="status">
        <h3>正在载入进程</h3>
        <p>准备当前桌面会话的进程数据。</p>
      </div>
    );
  }

  if (!items.length && error) {
    return (
      <div className="empty-state empty-state--error" role="alert">
        <h3>载入进程失败</h3>
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
        <h3>{hasQuery ? "没有匹配的进程" : "当前没有可见进程"}</h3>
        <p>
          {hasQuery
            ? `没有找到“${query}”相关进程。`
            : "当前工作区没有显示任何运行中的进程。"}
        </p>
      </div>
    );
  }

  return (
    <div className="process-table-wrap">
      <table className="process-table" aria-label="进程列表">
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
            const selected = selectedPid === item.pid;

            return (
              <tr
                key={item.pid}
                className={selected ? "is-selected" : undefined}
                onClick={() => onSelect(item)}
              >
                {columns.map((column) => {
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

                  if (column.key === "status") {
                    return (
                      <td
                        key={column.key}
                        className={column.align === "end" ? "align-end" : undefined}
                      >
                        <span className={`status-badge status-badge--${item.status}`}>
                          {formatMetricValue(item, column.key)}
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
                        {formatMetricValue(item, column.key)}
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
