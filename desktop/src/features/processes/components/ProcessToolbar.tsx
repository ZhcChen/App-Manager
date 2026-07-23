import { ActivityIcon, RefreshIcon, SearchIcon } from "../../../components/icons";

type ProcessToolbarProps = {
  activeViewLabel: string;
  query: string;
  resultCount: number;
  totalCount: number;
  isRefreshing: boolean;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onRefresh: () => void;
};

export function ProcessToolbar(props: ProcessToolbarProps) {
  const {
    activeViewLabel,
    query,
    resultCount,
    totalCount,
    isRefreshing,
    onQueryChange,
    onClearQuery,
    onRefresh
  } = props;

  return (
    <div className="monitor-toolbar">
      <div className="monitor-toolbar__overview">
        <span className="monitor-toolbar__overview-icon" aria-hidden="true">
          <ActivityIcon />
        </span>
        <div className="monitor-toolbar__overview-copy">
          <div className="monitor-toolbar__overview-headline">
            <h2>{activeViewLabel}</h2>
            <span className="monitor-toolbar__count">
              {query ? `${resultCount} / ${totalCount}` : `${totalCount} 个进程`}
            </span>
          </div>
        </div>
      </div>

      <div className="monitor-toolbar__controls">
        <div className="search-input-wrap monitor-toolbar__search-input">
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

          <button
            type="button"
            className="secondary-button monitor-toolbar__refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "正在刷新进程列表" : "刷新进程列表"}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
