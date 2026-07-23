import { useEffect, useMemo, useState, type CSSProperties } from "react";
import appManagerMarkUrl from "@app-manager/brand/logo/app-manager-mark.svg";
import { TransientToast } from "./components/TransientToast";
import { getDesktopBridge } from "./lib/desktopBridge";
import { loadDesktopBootstrap } from "./lib/desktopRuntime";
import { canTerminateProcess } from "./features/processes/guards";
import { ProcessList } from "./features/processes/components/ProcessList";
import { ProcessToolbar } from "./features/processes/components/ProcessToolbar";
import { TerminateDialog } from "./features/processes/components/TerminateDialog";
import {
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS,
  formatRefreshCadence,
  isAutoRefreshIntervalMs,
  type AutoRefreshIntervalMs
} from "./features/processes/refresh-policy";
import type { ProcessItem } from "./features/processes/types";
import { useProcesses } from "./features/processes/useProcesses";
import {
  type ProcessSortKey,
  type ProcessViewId,
  PROCESS_VIEW_CONFIG,
  PROCESS_VIEW_LABELS,
  PROCESS_VIEW_ORDER,
  getMetricValue
} from "./features/processes/view-config";

const AUTO_REFRESH_INTERVAL_STORAGE_KEY = "app-manager:auto-refresh-interval";

function getInitialAutoRefreshInterval(): AutoRefreshIntervalMs {
  if (typeof window === "undefined") {
    return AUTO_REFRESH_INTERVAL_MS;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTO_REFRESH_INTERVAL_STORAGE_KEY);
    if (!rawValue) {
      return AUTO_REFRESH_INTERVAL_MS;
    }

    const parsedValue = Number(rawValue);
    return isAutoRefreshIntervalMs(parsedValue)
      ? parsedValue
      : AUTO_REFRESH_INTERVAL_MS;
  } catch {
    return AUTO_REFRESH_INTERVAL_MS;
  }
}

export function App() {
  const [activeView, setActiveView] = useState<ProcessViewId>("cpu");
  const [autoRefreshIntervalMs, setAutoRefreshIntervalMs] =
    useState<AutoRefreshIntervalMs>(getInitialAutoRefreshInterval);
  const [query, setQuery] = useState("");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [target, setTarget] = useState<ProcessItem | null>(null);
  const [sortKey, setSortKey] = useState<ProcessSortKey>(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.key
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.direction
  );
  const processes = useProcesses(autoRefreshIntervalMs);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AUTO_REFRESH_INTERVAL_STORAGE_KEY,
        String(autoRefreshIntervalMs)
      );
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }, [autoRefreshIntervalMs]);

  useEffect(() => {
    void loadDesktopBootstrap().then((result) => {
      if (result.runtime === "electron") {
        void processes.refresh("initial");
      }
    });
  }, [processes.refresh]);

  useEffect(() => {
    const next = PROCESS_VIEW_CONFIG[activeView].defaultSort;
    setSortKey(next.key);
    setSortDirection(next.direction);
  }, [activeView]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = processes.items.filter((item) => {
      if (!normalized) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalized) ||
        item.path.toLowerCase().includes(normalized) ||
        item.userName.toLowerCase().includes(normalized) ||
        String(item.pid).includes(normalized)
      );
    });

    next.sort((left, right) => {
      const leftValue = getMetricValue(left, sortKey);
      const rightValue = getMetricValue(right, sortKey);

      if (leftValue === null && rightValue === null) {
        return left.name.localeCompare(right.name, "zh-CN");
      }

      if (leftValue === null) {
        return 1;
      }

      if (rightValue === null) {
        return -1;
      }

      let result = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else {
        result = String(leftValue).localeCompare(String(rightValue), "zh-CN");
      }

      if (result === 0) {
        result = left.name.localeCompare(right.name, "zh-CN");
      }

      return sortDirection === "asc" ? result : -result;
    });

    return next;
  }, [processes.items, query, sortDirection, sortKey]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedPid(null);
      return;
    }

    if (selectedPid === null) {
      setSelectedPid(filteredItems[0].pid);
      return;
    }

    if (!filteredItems.some((item) => item.pid === selectedPid)) {
      setSelectedPid(filteredItems[0].pid);
    }
  }, [filteredItems, selectedPid]);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.onProcessContextAction) {
      return undefined;
    }

    return bridge.onProcessContextAction((action) => {
      if (action.action !== "terminate") {
        return;
      }

      const item = processes.items.find((entry) => entry.pid === action.pid);
      if (!item) {
        return;
      }

      setSelectedPid(item.pid);
      setTarget(item);
    });
  }, [processes.items]);

  const viewTabsStyle = useMemo(() => {
    return {
      "--tab-count": String(PROCESS_VIEW_ORDER.length),
      "--tab-active-index": String(PROCESS_VIEW_ORDER.indexOf(activeView))
    } as CSSProperties;
  }, [activeView]);

  const handleConfirmTerminate = async () => {
    if (!target) {
      return;
    }

    await processes.terminate(target);
    setTarget(null);
  };

  return (
    <main className="app-shell">
      <section className="monitor-shell">
        <header className="monitor-header">
          <div className="monitor-header__title">
            <img
              className="monitor-header__brand-mark"
              src={appManagerMarkUrl}
              alt="App Manager 标志"
            />
            <div className="monitor-header__copy">
              <h1>App Manager</h1>
              <p>进程监视器</p>
            </div>
          </div>

          <nav className="view-tabs" aria-label="监视视图" style={viewTabsStyle}>
            <span className="view-tabs__indicator" aria-hidden="true" />
            {PROCESS_VIEW_ORDER.map((view) => (
              <button
                key={view}
                type="button"
                className={view === activeView ? "is-active" : undefined}
                onClick={() => setActiveView(view)}
              >
                {PROCESS_VIEW_LABELS[view]}
              </button>
            ))}
          </nav>

          <div className="monitor-header__actions">
            <label className="refresh-interval-control">
              <span className="refresh-interval-control__label">自动刷新</span>
              <span className="refresh-interval-control__field">
                <select
                  aria-label="自动刷新间隔"
                  value={String(autoRefreshIntervalMs)}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (isAutoRefreshIntervalMs(nextValue)) {
                      setAutoRefreshIntervalMs(nextValue);
                    }
                  }}
                >
                  {AUTO_REFRESH_INTERVAL_OPTIONS_MS.map((intervalMs) => (
                    <option key={intervalMs} value={String(intervalMs)}>
                      {formatRefreshCadence(intervalMs)}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </header>

        <ProcessToolbar
          activeViewLabel={PROCESS_VIEW_LABELS[activeView]}
          query={query}
          resultCount={filteredItems.length}
          totalCount={processes.items.length}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery("")}
        />

        <ProcessList
          items={filteredItems}
          columns={PROCESS_VIEW_CONFIG[activeView].columns}
          error={processes.error}
          isLoading={processes.isLoading}
          query={query}
          selectedPid={selectedPid}
          sortKey={sortKey}
          sortDirection={sortDirection}
          terminatingPid={processes.terminatingPid}
          onSelect={(item) => setSelectedPid(item.pid)}
          onOpenContextMenu={(item, position) => {
            const bridge = getDesktopBridge();
            if (bridge?.showProcessContextMenu) {
              void bridge.showProcessContextMenu(item, position).catch(() => {
                if (canTerminateProcess(item)) {
                  setTarget(item);
                }
              });
              return;
            }

            if (canTerminateProcess(item)) {
              setTarget(item);
            }
          }}
          onSortChange={(key) => {
            if (key === sortKey) {
              setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
              return;
            }

            setSortKey(key);
            setSortDirection("desc");
          }}
          onRetry={() => {
            void processes.refresh();
          }}
        />
      </section>

      <TerminateDialog
        item={target}
        onCancel={() => setTarget(null)}
        onConfirm={handleConfirmTerminate}
      />

      <TransientToast
        item={processes.feedback}
        onClear={processes.dismissFeedback}
      />
    </main>
  );
}
