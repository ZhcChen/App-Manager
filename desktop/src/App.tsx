import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import appManagerMarkUrl from "@app-manager/brand/logo/app-manager-mark.svg";
import packageJson from "../package.json";
import { ActivityIcon, PortIcon } from "./components/icons";
import type { TransientFeedback } from "./components/feedback";
import { RefreshIntervalSelect } from "./components/RefreshIntervalSelect";
import { TransientToast } from "./components/TransientToast";
import { getDesktopBridge } from "./lib/desktopBridge";
import { loadDesktopBootstrap, type DesktopBootstrap } from "./lib/desktopRuntime";
import { canTerminateProcess } from "./features/processes/guards";
import { ProcessList } from "./features/processes/components/ProcessList";
import { ProcessToolbar } from "./features/processes/components/ProcessToolbar";
import { TerminateDialog } from "./features/processes/components/TerminateDialog";
import { PortList } from "./features/ports/components/PortList";
import { UpdateDialog } from "./features/updates/components/UpdateDialog";
import { openUpdateDownload, toUpdateApiError } from "./features/updates/api";
import { useUpdateCheck } from "./features/updates/useUpdateCheck";
import {
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS,
  formatRefreshCadence,
  isAutoRefreshIntervalMs,
  type AutoRefreshIntervalMs
} from "./features/processes/refresh-policy";
import { useProcesses } from "./features/processes/useProcesses";
import {
  type ProcessSortKey,
  type ProcessViewId,
  PROCESS_VIEW_CONFIG,
  PROCESS_VIEW_LABELS,
  PROCESS_VIEW_ORDER,
  getMetricValue
} from "./features/processes/view-config";
import { usePorts } from "./features/ports/usePorts";
import {
  type PortSortKey,
  PORT_VIEW_CONFIG,
  getPortMetricValue
} from "./features/ports/view-config";

const AUTO_REFRESH_INTERVAL_STORAGE_KEY = "app-manager:auto-refresh-interval";
const MONITOR_VIEW_ORDER = [...PROCESS_VIEW_ORDER, "ports"] as const;
type MonitorViewId = ProcessViewId | "ports";
const MONITOR_VIEW_LABELS: Record<MonitorViewId, string> = {
  ...PROCESS_VIEW_LABELS,
  ports: "端口"
};

type TerminateTarget = {
  pid: number;
  name: string;
};

type ActiveFeedback = {
  source: "processes" | "ports" | "updates";
  item: TransientFeedback;
};

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

function isProcessView(view: MonitorViewId): view is ProcessViewId {
  return view !== "ports";
}

export function App() {
  const [bootstrapState, setBootstrapState] = useState<DesktopBootstrap>({
    appName: "App Manager",
    appVersion: packageJson.version,
    runtime: "browser",
    shell: "desktop"
  });
  const [activeView, setActiveView] = useState<MonitorViewId>("cpu");
  const [autoRefreshIntervalMs, setAutoRefreshIntervalMs] =
    useState<AutoRefreshIntervalMs>(getInitialAutoRefreshInterval);
  const [query, setQuery] = useState("");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [target, setTarget] = useState<TerminateTarget | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<TransientFeedback | null>(
    null
  );
  const isMountedRef = useRef(true);
  const updateFeedbackIdRef = useRef(0);
  const [sortKey, setSortKey] = useState<ProcessSortKey>(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.key
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    PROCESS_VIEW_CONFIG.cpu.defaultSort.direction
  );
  const [portSortKey, setPortSortKey] = useState<PortSortKey>(
    PORT_VIEW_CONFIG.defaultSort.key
  );
  const [portSortDirection, setPortSortDirection] = useState<"asc" | "desc">(
    PORT_VIEW_CONFIG.defaultSort.direction
  );
  const processes = useProcesses(autoRefreshIntervalMs);
  const ports = usePorts(autoRefreshIntervalMs);
  const updates = useUpdateCheck(bootstrapState.appVersion);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    if (!getDesktopBridge()) {
      return;
    }

    void loadDesktopBootstrap().then((result) => {
      if (!isMountedRef.current) {
        return;
      }

      setBootstrapState(result);
      if (result.runtime === "electron") {
        void Promise.all([
          processes.refresh("initial"),
          ports.refresh("initial")
        ]);
      }
    });
  }, [ports.refresh, processes.refresh]);

  useEffect(() => {
    if (!isProcessView(activeView)) {
      return;
    }

    const next = PROCESS_VIEW_CONFIG[activeView].defaultSort;
    setSortKey(next.key);
    setSortDirection(next.direction);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "ports") {
      return;
    }

    const next = PORT_VIEW_CONFIG.defaultSort;
    setPortSortKey(next.key);
    setPortSortDirection(next.direction);
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

  const filteredPorts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = ports.items.filter((item) => {
      if (!normalized) {
        return true;
      }

      return (
        String(item.localPort).includes(normalized) ||
        item.protocol.toLowerCase().includes(normalized) ||
        item.localAddress.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized) ||
        item.path.toLowerCase().includes(normalized) ||
        item.userName.toLowerCase().includes(normalized) ||
        String(item.pid).includes(normalized)
      );
    });

    next.sort((left, right) => {
      const leftValue = getPortMetricValue(left, portSortKey);
      const rightValue = getPortMetricValue(right, portSortKey);

      let result = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else {
        result = String(leftValue).localeCompare(String(rightValue), "zh-CN");
      }

      if (result === 0) {
        result =
          left.localPort - right.localPort ||
          left.name.localeCompare(right.name, "zh-CN") ||
          left.pid - right.pid;
      }

      return portSortDirection === "asc" ? result : -result;
    });

    return next;
  }, [portSortDirection, portSortKey, ports.items, query]);

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
    if (!filteredPorts.length) {
      setSelectedPortId(null);
      return;
    }

    if (selectedPortId === null) {
      setSelectedPortId(filteredPorts[0].id);
      return;
    }

    if (!filteredPorts.some((item) => item.id === selectedPortId)) {
      setSelectedPortId(filteredPorts[0].id);
    }
  }, [filteredPorts, selectedPortId]);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.onProcessContextAction) {
      return undefined;
    }

    return bridge.onProcessContextAction((action) => {
      if (action.action !== "terminate") {
        return;
      }

      const item =
        processes.items.find((entry) => entry.pid === action.pid) ??
        ports.items.find((entry) => entry.pid === action.pid);
      if (!item) {
        return;
      }

      if ("id" in item) {
        setSelectedPortId(item.id);
      } else {
        setSelectedPid(item.pid);
      }

      setTarget({
        pid: item.pid,
        name: item.name
      });
    });
  }, [ports.items, processes.items]);

  const viewTabsStyle = useMemo(() => {
    return {
      "--tab-count": String(MONITOR_VIEW_ORDER.length),
      "--tab-active-index": String(MONITOR_VIEW_ORDER.indexOf(activeView)),
      gridTemplateColumns: `repeat(${MONITOR_VIEW_ORDER.length}, minmax(0, 1fr))`
    } as CSSProperties;
  }, [activeView]);

  const handleConfirmTerminate = async () => {
    if (!target) {
      return;
    }

    const didTerminate = await processes.terminate(target);
    if (didTerminate) {
      await ports.refresh("background", {
        reportFailure: activeView === "ports"
      });
    }
    setTarget(null);
  };

  const pushUpdateFeedback = useCallback((title: string, message: string) => {
    if (!isMountedRef.current) {
      return;
    }

    updateFeedbackIdRef.current += 1;
    setUpdateFeedback({
      id: updateFeedbackIdRef.current,
      tone: "error",
      title,
      message
    });
  }, []);

  const activeViewLabel = MONITOR_VIEW_LABELS[activeView];
  const activeFeedback = useMemo<ActiveFeedback | null>(() => {
    if (updateFeedback) {
      return {
        source: "updates",
        item: updateFeedback
      };
    }

    if (activeView === "ports") {
      if (ports.feedback) {
        return {
          source: "ports",
          item: ports.feedback
        };
      }

      if (processes.feedback) {
        return {
          source: "processes",
          item: processes.feedback
        };
      }

      return null;
    }

    if (processes.feedback) {
      return {
        source: "processes",
        item: processes.feedback
      };
    }

    return null;
  }, [activeView, ports.feedback, processes.feedback, updateFeedback]);

  return (
    <main className="app-shell">
      <section className="monitor-shell">
        <header className="monitor-header">
          <div className="monitor-header__title">
            <img
              className="monitor-header__brand-mark"
              src={appManagerMarkUrl}
              alt={`${bootstrapState.appName} 标志`}
            />
            <div className="monitor-header__copy">
              <div className="monitor-header__name-row">
                <h1>{bootstrapState.appName}</h1>
                <button
                  type="button"
                  className={`app-version-button ${
                    updates.hasUpdate ? "has-update" : ""
                  }`}
                  aria-label={
                    updates.hasUpdate
                      ? `当前版本 v${bootstrapState.appVersion}，发现新版本`
                      : `当前版本 v${bootstrapState.appVersion}`
                  }
                  onClick={() => setUpdateDialogOpen(true)}
                >
                  v{bootstrapState.appVersion}
                  {updates.hasUpdate ? (
                    <span className="app-version-button__dot" aria-hidden="true" />
                  ) : null}
                </button>
              </div>
              <p>进程与端口监视器</p>
            </div>
          </div>

          <nav className="view-tabs" aria-label="监视视图" style={viewTabsStyle}>
            <span className="view-tabs__indicator" aria-hidden="true" />
            {MONITOR_VIEW_ORDER.map((view) => (
              <button
                key={view}
                type="button"
                className={view === activeView ? "is-active" : undefined}
                onClick={() => setActiveView(view)}
              >
                {MONITOR_VIEW_LABELS[view]}
              </button>
            ))}
          </nav>

          <div className="monitor-header__actions">
            <RefreshIntervalSelect
              options={AUTO_REFRESH_INTERVAL_OPTIONS_MS}
              value={autoRefreshIntervalMs}
              formatLabel={formatRefreshCadence}
              onChange={(nextValue) => {
                if (isAutoRefreshIntervalMs(nextValue)) {
                  setAutoRefreshIntervalMs(nextValue);
                }
              }}
            />
          </div>
        </header>

        <ProcessToolbar
          activeViewLabel={activeViewLabel}
          countNoun={activeView === "ports" ? "端口" : "进程"}
          searchAriaLabel={activeView === "ports" ? "搜索端口" : "搜索进程"}
          searchPlaceholder={
            activeView === "ports"
              ? "搜索端口、协议、进程、路径或 PID"
              : "搜索进程、路径、用户或 PID"
          }
          overviewIcon={activeView === "ports" ? <PortIcon /> : <ActivityIcon />}
          query={query}
          resultCount={activeView === "ports" ? filteredPorts.length : filteredItems.length}
          totalCount={activeView === "ports" ? ports.items.length : processes.items.length}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery("")}
        />

        {activeView === "ports" ? (
          <PortList
            items={filteredPorts}
            columns={PORT_VIEW_CONFIG.columns}
            error={ports.error}
            isLoading={ports.isLoading}
            query={query}
            selectedId={selectedPortId}
            sortKey={portSortKey}
            sortDirection={portSortDirection}
            terminatingPid={processes.terminatingPid}
            onSelect={(item) => setSelectedPortId(item.id)}
            onOpenContextMenu={(item, position) => {
              const bridge = getDesktopBridge();
              if (bridge?.showProcessContextMenu) {
                void bridge.showProcessContextMenu(item, position).catch(() => {
                  if (canTerminateProcess(item)) {
                    setTarget({ pid: item.pid, name: item.name });
                  }
                });
                return;
              }

              if (canTerminateProcess(item)) {
                setTarget({ pid: item.pid, name: item.name });
              }
            }}
            onSortChange={(key) => {
              if (key === portSortKey) {
                setPortSortDirection((current) =>
                  current === "asc" ? "desc" : "asc"
                );
                return;
              }

              setPortSortKey(key);
              setPortSortDirection("asc");
            }}
            onRetry={() => {
              void ports.refresh();
            }}
          />
        ) : (
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
                    setTarget({ pid: item.pid, name: item.name });
                  }
                });
                return;
              }

              if (canTerminateProcess(item)) {
                setTarget({ pid: item.pid, name: item.name });
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
        )}
      </section>

      <TerminateDialog
        item={target}
        onCancel={() => setTarget(null)}
        onConfirm={handleConfirmTerminate}
      />

      <UpdateDialog
        isOpen={updateDialogOpen}
        currentVersion={bootstrapState.appVersion}
        result={updates.result}
        error={updates.error}
        isChecking={updates.isChecking}
        onClose={() => setUpdateDialogOpen(false)}
        onCheckNow={() => {
          void updates.check("manual");
        }}
        onOpenDownload={async (url) => {
          try {
            await openUpdateDownload(url);
          } catch (cause) {
            pushUpdateFeedback(
              "打开下载失败",
              toUpdateApiError(cause).message
            );
            throw cause;
          }
        }}
      />

      <TransientToast
        item={activeFeedback?.item ?? null}
        onClear={(feedbackId) => {
          if (activeFeedback?.source === "ports") {
            ports.dismissFeedback(feedbackId);
            return;
          }

          if (activeFeedback?.source === "updates") {
            setUpdateFeedback((current) =>
              current?.id === feedbackId ? null : current
            );
            return;
          }

          if (activeFeedback?.source === "processes") {
            processes.dismissFeedback(feedbackId);
          }
        }}
      />
    </main>
  );
}
