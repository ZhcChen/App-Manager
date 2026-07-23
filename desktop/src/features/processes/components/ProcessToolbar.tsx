import type { ReactNode } from "react";
import { ActivityIcon, SearchIcon } from "../../../components/icons";

type ProcessToolbarProps = {
  activeViewLabel: string;
  countNoun?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
  overviewIcon?: ReactNode;
  query: string;
  resultCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
};

export function ProcessToolbar(props: ProcessToolbarProps) {
  const {
    activeViewLabel,
    countNoun = "进程",
    searchAriaLabel = "搜索进程",
    searchPlaceholder = "搜索进程、路径、用户或 PID",
    overviewIcon,
    query,
    resultCount,
    totalCount,
    onQueryChange,
    onClearQuery
  } = props;

  return (
    <div className="monitor-toolbar">
      <div className="monitor-toolbar__overview">
        <span className="monitor-toolbar__overview-icon" aria-hidden="true">
          {overviewIcon ?? <ActivityIcon />}
        </span>
        <div className="monitor-toolbar__overview-copy">
          <div className="monitor-toolbar__overview-headline">
            <h2>{activeViewLabel}</h2>
            <span className="monitor-toolbar__count">
              {query ? `${resultCount} / ${totalCount}` : `${totalCount} 个${countNoun}`}
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
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
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
      </div>
    </div>
  );
}
