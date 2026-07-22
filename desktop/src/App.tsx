import { useEffect, useMemo, useState } from "react";
import appManagerMark from "@app-manager/brand/logo/app-manager-mark.svg";
import { loadDesktopBootstrap, type DesktopBootstrap } from "./lib/desktopRuntime";
import type { ProcessItem } from "./features/processes/types";
import { ProcessToolbar } from "./features/processes/components/ProcessToolbar";
import { ProcessList } from "./features/processes/components/ProcessList";
import { TerminateDialog } from "./features/processes/components/TerminateDialog";
import { formatRefreshCadence } from "./features/processes/refresh-policy";
import { useProcesses } from "./features/processes/useProcesses";

const INITIAL_BOOTSTRAP: DesktopBootstrap = {
  appName: "App Manager",
  runtime: "browser",
  shell: "desktop"
};

export function App() {
  const [bootstrap, setBootstrap] = useState(INITIAL_BOOTSTRAP);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"name" | "pid">("name");
  const [target, setTarget] = useState<ProcessItem | null>(null);
  const processes = useProcesses();

  useEffect(() => {
    void loadDesktopBootstrap().then((result) => {
      if (result.runtime === "tauri") {
        setBootstrap(result);
        void processes.refresh("initial");
      }
    });
  }, [processes.refresh]);

  const statusMessage = useMemo(() => {
    if (processes.error) {
      return processes.error.message;
    }

    if (processes.isLoading) {
      return "Loading process list";
    }

    if (processes.isRefreshing) {
      return "Refreshing process list";
    }

    if (processes.terminatingPid !== null) {
      return "Ending selected process";
    }

    if (processes.notice) {
      return processes.notice;
    }

    return bootstrap.runtime === "tauri"
      ? "Tauri desktop shell connected"
      : "Browser preview mode";
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
        String(item.pid).includes(normalized)
      );
    });

    next.sort((left, right) => {
      if (sortMode === "pid") {
        return left.pid - right.pid;
      }

      return left.name.localeCompare(right.name, "zh-CN");
    });

    return next;
  }, [processes.items, query, sortMode]);

  const handleConfirmTerminate = async () => {
    if (!target) {
      return;
    }

    await processes.terminate(target);
    setTarget(null);
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-brand">
          <img
            className="hero-logo"
            src={appManagerMark}
            alt="App Manager logo"
          />
          <div>
            <p className="eyebrow">Desktop process control</p>
            <h1>App Manager</h1>
            <p className="hero-copy">
              冷静、直接、低干扰的桌面应用管理界面。当前阶段先打通
              Tauri 桌面壳与核心流程 UI。
            </p>
          </div>
        </div>

        <div className="hero-meta">
          <div className="meta-item">
            <span className="meta-label">Runtime</span>
            <strong>{bootstrap.runtime}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-label">Shell</span>
            <strong>{bootstrap.shell}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-label">Refresh cadence</span>
            <strong>
              {bootstrap.runtime === "tauri"
                ? formatRefreshCadence()
                : "Preview"}
            </strong>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <header className="workspace-header">
          <div>
            <p className="section-label">Running apps</p>
            <h2>Process workspace</h2>
          </div>
          <div className="header-actions">
            <span className="status-pill">{statusMessage}</span>
          </div>
        </header>

        <ProcessToolbar
          query={query}
          sortMode={sortMode}
          isRefreshing={processes.isRefreshing}
          onQueryChange={setQuery}
          onSortModeChange={setSortMode}
          onRefresh={() => {
            void processes.refresh();
          }}
        />

        <ProcessList
          items={filteredItems}
          error={processes.error}
          isLoading={processes.isLoading}
          terminatingPid={processes.terminatingPid}
          onTerminate={setTarget}
        />

        <footer className="workspace-footer">
          <span>Last refresh {processes.lastRefresh}</span>
          <span>
            {bootstrap.runtime === "tauri"
              ? `Auto refresh ${formatRefreshCadence()}`
              : "Preview data only"}
          </span>
          <span>{bootstrap.appName}</span>
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
