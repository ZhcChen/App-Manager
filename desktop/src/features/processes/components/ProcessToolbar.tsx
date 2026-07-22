type ProcessToolbarProps = {
  query: string;
  sortMode: "name" | "pid";
  isRefreshing: boolean;
  onQueryChange: (value: string) => void;
  onSortModeChange: (value: "name" | "pid") => void;
  onRefresh: () => void;
};

export function ProcessToolbar(props: ProcessToolbarProps) {
  const { query, sortMode, isRefreshing, onQueryChange, onSortModeChange, onRefresh } =
    props;

  return (
    <div className="toolbar">
      <label className="search-field">
        <span className="search-label">Search</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search running apps, path, or PID"
          aria-label="Search running apps"
        />
      </label>

      <label className="sort-field">
        <span>Sort</span>
        <select
          aria-label="Sort process list"
          value={sortMode}
          onChange={(event) =>
            onSortModeChange(event.target.value as "name" | "pid")
          }
        >
          <option value="name">Name</option>
          <option value="pid">PID</option>
        </select>
      </label>

      <button
        type="button"
        className="secondary-button toolbar-button"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
