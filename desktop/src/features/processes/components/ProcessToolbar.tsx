import { ActivityIcon, RefreshIcon, SearchIcon } from "../../../components/icons";

type ProcessToolbarProps = {
  activeViewLabel: string;
  activeViewSummary: string;
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
    activeViewSummary,
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
          <p>
            {query ? `已筛选 ${resultCount} / ${totalCount} 个进程，` : ""}
            {activeViewSummary}
          </p>
        </div>
      </div>

      <div className="monitor-toolbar__controls">
        <div className="monitor-toolbar__search-row">
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

          <button
            type="button"
            className="secondary-button monitor-toolbar__refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshIcon />
            <span>{isRefreshing ? "刷新中…" : "刷新"}</span>
          </button>
        </div>

        <p className="monitor-toolbar__hint">右击列表项可结束进程</p>
      </div>
    </div>
  );
}
