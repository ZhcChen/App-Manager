import { useCallback, useEffect, useMemo, useState } from "react";
import { isElectronRuntime } from "@/lib/desktopRuntime";
import { mockProcesses } from "./mockProcesses";
import { listProcesses, terminateProcess, toProcessApiError } from "./api";
import {
  AUTO_REFRESH_INTERVAL_MS,
  type RefreshMode,
  usesVisibleRefreshState
} from "./refresh-policy";
import type { ProcessApiError, ProcessItem } from "./types";

function formatRefreshTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

export function useProcesses() {
  const previewMode = !isElectronRuntime();
  const [items, setItems] = useState<ProcessItem[]>(previewMode ? mockProcesses : []);
  const [error, setError] = useState<ProcessApiError | null>(null);
  const [isLoading, setIsLoading] = useState(!previewMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(previewMode ? formatRefreshTime() : "--:--:--");
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(
    async (mode: RefreshMode = "manual") => {
      setError(null);

      if (mode === "initial") {
        setIsLoading(true);
      } else if (usesVisibleRefreshState(mode)) {
        setIsRefreshing(true);
      }

      try {
        const next = await listProcesses();
        setItems(next);
        setError(null);
        setLastRefresh(formatRefreshTime());
        if (mode === "manual") {
          setNotice(`已刷新 ${next.length} 个进程`);
        }
      } catch (cause) {
        setError(toProcessApiError(cause));
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }

        if (usesVisibleRefreshState(mode)) {
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (previewMode) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void refresh("background");
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [previewMode, refresh]);

  const terminate = useCallback(
    async (item: ProcessItem) => {
      setTerminatingPid(item.pid);

      try {
        const result = await terminateProcess(item.pid);
        setError(null);
        setNotice(`已结束 ${result.name}（${result.pid}）`);
        await refresh("background");
        return true;
      } catch (cause) {
        setNotice(null);
        setError(toProcessApiError(cause));
        return false;
      } finally {
        setTerminatingPid(null);
      }
    },
    [refresh]
  );

  const state = useMemo(
    () => ({
      items,
      error,
      isLoading,
      isRefreshing,
      terminatingPid,
      lastRefresh,
      notice
    }),
    [items, error, isLoading, isRefreshing, terminatingPid, lastRefresh, notice]
  );

  return {
    ...state,
    refresh,
    terminate
  };
}
