import { useEffect, useMemo, useState } from "react";
import appManagerMarkUrl from "@app-manager/brand/logo/app-manager-mark.svg";
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

  const statusMessage = useMemo(() => {
    if (processes.error) {
      return processes.error.message;
    }

    if (processes.isLoading) {
      return "正在载入进程列表";
    }

    if (processes.isRefreshing) {
      return "正在刷新进程视图";
    }

    if (processes.terminatingPid !== null) {
      return "正在结束选中进程";
    }

    if (processes.notice) {
      return processes.notice;
    }

    return bootstrap.runtime === "electron" ? "实时桌面进程视图" : "浏览器预览模式";
  }, [
    bootstrap.runtime,
    processes.error,
    processes.isLoading,
    processes.isRefreshing,
    processes.notice,
    processes.terminatingPid
  ]);

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

  const protectedCount = useMemo(() => {
    return processes.items.filter((item) => !item.canTerminate).length;
  }, [processes.items]);

  const statusTone = useMemo(() => {
    if (processes.error) {
      return "error";
    }

    if (processes.terminatingPid !== null) {
      return "warning";
    }

    if (processes.notice) {
      return "success";
    }

    return "info";
  }, [processes.error, processes.notice, processes.terminatingPid]);

  const totalCpuUsage = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.cpuUsagePercent, 0);
  }, [filteredItems]);

  const totalMemoryBytes = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.memoryBytes, 0);
  }, [filteredItems]);

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

          <nav className="view-tabs" aria-label="监视视图">
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

          <div className="monitor-header__status">
            <span className={`status-pill status-pill--${statusTone}`}>
              {statusMessage}
            </span>
            <span className="monitor-header__runtime">
              {bootstrap.runtime === "electron" ? "Live OS" : "Preview"}
            </span>
          </div>
        </header>

        <ProcessToolbar
          activeViewLabel={PROCESS_VIEW_LABELS[activeView]}
          query={query}
          resultCount={filteredItems.length}
          totalCount={processes.items.length}
          isRefreshing={processes.isRefreshing}
          selectedName={selectedItem?.name ?? null}
          canTerminateSelected={selectedItem ? canTerminateProcess(selectedItem) : false}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery("")}
          onRefresh={() => {
            void processes.refresh();
          }}
          onTerminateSelected={() => {
            if (selectedItem) {
              setTarget(selectedItem);
            }
          }}
        />

        <section className="monitor-summary">
          <div className="monitor-summary__primary">
            <p className="section-label">当前视图</p>
            <h2>{PROCESS_VIEW_LABELS[activeView]}</h2>
            <p>{PROCESS_VIEW_CONFIG[activeView].summary}</p>
          </div>
          <dl className="monitor-summary__stats">
            <div>
              <dt>进程</dt>
              <dd>{filteredItems.length}</dd>
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
        </section>

        {processes.error ? (
          <section className="feedback-banner feedback-banner--error" role="alert">
            <div>
              <p className="feedback-banner__title">进程列表更新失败</p>
              <p className="feedback-banner__copy">{processes.error.message}</p>
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
            <div>
              <p className="feedback-banner__title">最近动作</p>
              <p className="feedback-banner__copy">{processes.notice}</p>
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
            <p className="section-label">选中进程</p>
            {selectedItem ? (
              <>
                <h3>{selectedItem.name}</h3>
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
              <p className="section-label">会话状态</p>
              <h3>{bootstrap.runtime === "electron" ? "桌面实时连接" : "浏览器预览"}</h3>
              <p>上次刷新 {processes.lastRefresh}</p>
              <p>自动刷新间隔 {formatRefreshCadence()}</p>
              <p>Shell: {bootstrap.shell}</p>
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
              {selectedItem ? `结束 ${selectedItem.name}` : "结束进程"}
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
