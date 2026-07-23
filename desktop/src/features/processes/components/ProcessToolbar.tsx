import { ActivityIcon, RefreshIcon, SearchIcon, StopIcon } from "../../../components/icons";

type ProcessToolbarProps = {
  activeViewLabel: string;
  query: string;
  resultCount: number;
  totalCount: number;
  isRefreshing: boolean;
  selectedName: string | null;
  canTerminateSelected: boolean;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onRefresh: () => void;
  onTerminateSelected: () => void;
};

export function ProcessToolbar(props: ProcessToolbarProps) {
  const {
    activeViewLabel,
    query,
    resultCount,
    totalCount,
    isRefreshing,
    selectedName,
    canTerminateSelected,
    onQueryChange,
    onClearQuery,
    onRefresh,
    onTerminateSelected
  } = props;

  return (
    <div className="monitor-toolbar">
      <div className="monitor-toolbar__meta">
        <p className="toolbar-title">
          <span className="toolbar-title__icon" aria-hidden="true">
            <ActivityIcon />
          </span>
          <span>{activeViewLabel}</span>
        </p>
        <p className="toolbar-subtitle">
          {query
            ? `显示 ${resultCount} / ${totalCount} 个进程`
            : `当前共 ${totalCount} 个可见进程`}
        </p>
      </div>

      <label className="search-field monitor-toolbar__search">
        <span className="search-label">搜索</span>
        <div className="search-input-wrap">
          <span className="search-input-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索进程、路径、用户或 PID"
            aria-label="搜索进程"
          />
          {query ? (
            <button
              type="button"
              className="text-button search-clear-button"
              onClick={onClearQuery}
            >
              清空
            </button>
          ) : null}
        </div>
      </label>

      <div className="monitor-toolbar__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshIcon />
          <span>{isRefreshing ? "刷新中…" : "刷新"}</span>
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={onTerminateSelected}
          disabled={!selectedName || !canTerminateSelected}
        >
          <StopIcon />
          <span>{selectedName ? `结束“${selectedName}”` : "结束进程"}</span>
        </button>
      </div>
    </div>
  );
}
