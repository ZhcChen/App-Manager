import { useEffect, useMemo, useState, type CSSProperties } from "react";
import appManagerMarkUrl from "@app-manager/brand/logo/app-manager-mark.svg";
import {
  ActivityIcon,
  AlertIcon,
  AppTileIcon,
  DesktopIcon,
  RefreshIcon,
  StopIcon,
  SuccessIcon
} from "./components/icons";
import { getDesktopBridge } from "./lib/desktopBridge";
import { loadDesktopBootstrap, type DesktopBootstrap } from "./lib/desktopRuntime";
import { canTerminateProcess } from "./features/processes/guards";
import { ProcessList } from "./features/processes/components/ProcessList";
import { ProcessToolbar } from "./features/processes/components/ProcessToolbar";
import { TerminateDialog } from "./features/processes/components/TerminateDialog";
import { formatBytes, formatDuration, formatStartedAt } from "./features/processes/formatters";
import { formatRefreshCadence } from "./features/processes/refresh-policy";
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

const INITIAL_BOOTSTRAP: DesktopBootstrap = {
  appName: "App Manager",
  runtime: "browser",
  shell: "desktop"
};

export function App() {
  const [bootstrap, setBootstrap] = useState(INITIAL_BOOTSTRAP);
  const [activeView, setActiveView] = useState<ProcessViewId>("cpu");
  const [query, setQuery] = useState("");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [target, setTarget] = useState<ProcessItem | null>(null);
  const [sortKey, setSortKey] = useState<ProcessSortKey>(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.key
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.direction
  );
  const processes = useProcesses();

  useEffect(() => {
    void loadDesktopBootstrap().then((result) => {
      if (result.runtime === "electron") {
        setBootstrap(result);
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

  const selectedItem = useMemo(() => {
    return filteredItems.find((item) => item.pid === selectedPid) ?? null;
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
        </header>

        <ProcessToolbar
          activeViewLabel={PROCESS_VIEW_LABELS[activeView]}
          activeViewSummary={PROCESS_VIEW_CONFIG[activeView].summary}
          query={query}
          resultCount={filteredItems.length}
          totalCount={processes.items.length}
          isRefreshing={processes.isRefreshing}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery("")}
          onRefresh={() => {
            void processes.refresh();
          }}
        />

        {processes.error ? (
          <section className="feedback-banner feedback-banner--error" role="alert">
            <div className="feedback-banner__main">
              <span className="feedback-banner__icon" aria-hidden="true">
                <AlertIcon />
              </span>
              <div>
                <p className="feedback-banner__title">进程列表更新失败</p>
                <p className="feedback-banner__copy">{processes.error.message}</p>
              </div>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                void processes.refresh();
              }}
            >
              重试
            </button>
          </section>
        ) : processes.notice ? (
          <section className="feedback-banner feedback-banner--success" role="status">
            <div className="feedback-banner__main">
              <span className="feedback-banner__icon" aria-hidden="true">
                <SuccessIcon />
              </span>
              <div>
                <p className="feedback-banner__title">最近动作</p>
                <p className="feedback-banner__copy">{processes.notice}</p>
              </div>
            </div>
          </section>
        ) : null}

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

        <footer className="detail-panel">
          <div className="detail-panel__selection">
            <div className="detail-panel__heading">
              <span className="detail-panel__heading-icon" aria-hidden="true">
                <AppTileIcon />
              </span>
              <div>
                <p className="section-label">选中进程</p>
                <h3>{selectedItem ? selectedItem.name : "尚未选择"}</h3>
              </div>
            </div>
            {selectedItem ? (
              <>
                <p className="detail-path">{selectedItem.path || "—"}</p>
                <dl className="detail-grid">
                  <div>
                    <dt>PID</dt>
                    <dd>{selectedItem.pid}</dd>
                  </div>
                  <div>
                    <dt>用户</dt>
                    <dd>{selectedItem.userName}</dd>
                  </div>
                  <div>
                    <dt>种类</dt>
                    <dd>{selectedItem.kindLabel}</dd>
                  </div>
                  <div>
                    <dt>启动时间</dt>
                    <dd>{formatStartedAt(selectedItem.startTimeSeconds)}</dd>
                  </div>
                  <div>
                    <dt>运行时间</dt>
                    <dd>{formatDuration(selectedItem.runTimeSeconds)}</dd>
                  </div>
                  <div>
                    <dt>常驻内存</dt>
                    <dd>{formatBytes(selectedItem.memoryBytes)}</dd>
                  </div>
                  <div>
                    <dt>读取总量</dt>
                    <dd>{formatBytes(selectedItem.diskReadBytes)}</dd>
                  </div>
                  <div>
                    <dt>写入总量</dt>
                    <dd>{formatBytes(selectedItem.diskWrittenBytes)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="detail-empty">选择一个进程以查看详情。</p>
            )}
          </div>

          <div className="detail-panel__actions">
            <div className="detail-card">
              <div className="detail-card__header">
                <p className="section-label">会话状态</p>
                <span className="detail-card__status">
                  <DesktopIcon />
                  <span>
                    {bootstrap.runtime === "electron" ? "桌面实时连接" : "浏览器预览"}
                  </span>
                </span>
              </div>
              <ul className="detail-meta-list">
                <li>
                  <span className="detail-meta-list__icon" aria-hidden="true">
                    <RefreshIcon />
                  </span>
                  <span>上次刷新</span>
                  <strong>{processes.lastRefresh}</strong>
                </li>
                <li>
                  <span className="detail-meta-list__icon" aria-hidden="true">
                    <ActivityIcon />
                  </span>
                  <span>自动刷新</span>
                  <strong>{formatRefreshCadence()}</strong>
                </li>
                <li>
                  <span className="detail-meta-list__icon" aria-hidden="true">
                    <DesktopIcon />
                  </span>
                  <span>Shell</span>
                  <strong>{bootstrap.shell}</strong>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="danger-button detail-panel__terminate"
              disabled={!selectedItem || !canTerminateProcess(selectedItem)}
              onClick={() => {
                if (selectedItem) {
                  setTarget(selectedItem);
                }
              }}
            >
              <StopIcon />
              <span>{selectedItem ? `结束 ${selectedItem.name}` : "结束进程"}</span>
            </button>
          </div>
        </footer>
      </section>

      <TerminateDialog
        item={target}
        onCancel={() => setTarget(null)}
        onConfirm={handleConfirmTerminate}
      />
    </main>
  );
}
