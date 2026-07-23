import { formatBytes } from "../formatters";
import { ActivityIcon, RefreshIcon, SearchIcon } from "../../../components/icons";

type ProcessToolbarProps = {
  activeViewLabel: string;
  activeViewSummary: string;
  query: string;
  resultCount: number;
  totalCount: number;
  totalCpuUsage: number;
  totalMemoryBytes: number;
  protectedCount: number;
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
    totalCpuUsage,
    totalMemoryBytes,
    protectedCount,
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
          <p className="section-label">当前视图</p>
          <h2>{activeViewLabel}</h2>
          <p>
            {query
              ? `显示 ${resultCount} / ${totalCount} 个进程`
              : `当前共 ${totalCount} 个可见进程`}
            <span className="monitor-toolbar__dot" aria-hidden="true">
              ·
            </span>
            {activeViewSummary}
          </p>
        </div>
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

      <div className="monitor-toolbar__cluster">
        <dl className="monitor-summary__stats monitor-toolbar__stats">
          <div>
            <dt>进程</dt>
            <dd>{resultCount}</dd>
          </div>
          <div>
            <dt>总 CPU</dt>
            <dd>{totalCpuUsage.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>总内存</dt>
            <dd>{formatBytes(totalMemoryBytes)}</dd>
          </div>
          <div>
            <dt>受保护</dt>
            <dd>{protectedCount}</dd>
          </div>
        </dl>

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
          <p className="monitor-toolbar__hint">右击列表项可结束进程</p>
        </div>
      </div>
    </div>
  );
}
