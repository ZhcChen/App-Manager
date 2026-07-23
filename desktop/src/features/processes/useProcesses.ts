import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isElectronRuntime } from "@/lib/desktopRuntime";
import { mockProcesses } from "./mockProcesses";
import { listProcesses, terminateProcess, toProcessApiError } from "./api";
import {
  AUTO_REFRESH_INTERVAL_MS,
  type AutoRefreshIntervalMs,
  type RefreshMode,
  usesVisibleRefreshState
} from "./refresh-policy";
import type { ProcessApiError, ProcessFeedback, ProcessItem } from "./types";

function formatRefreshTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

export function useProcesses(
  autoRefreshIntervalMs: AutoRefreshIntervalMs = AUTO_REFRESH_INTERVAL_MS
) {
  const previewMode = !isElectronRuntime();
  const [items, setItems] = useState<ProcessItem[]>(previewMode ? mockProcesses : []);
  const [error, setError] = useState<ProcessApiError | null>(null);
  const [isLoading, setIsLoading] = useState(!previewMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(previewMode ? formatRefreshTime() : "--:--:--");
  const [feedback, setFeedback] = useState<ProcessFeedback | null>(null);
  const feedbackIdRef = useRef(0);

  const pushFeedback = useCallback(
    (tone: ProcessFeedback["tone"], title: string, message: string) => {
      feedbackIdRef.current += 1;
      setFeedback({
        id: feedbackIdRef.current,
        tone,
        title,
        message
      });
    },
    []
  );

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
          pushFeedback("success", "最近动作", `已刷新 ${next.length} 个进程`);
        }
      } catch (cause) {
        const nextError = toProcessApiError(cause);
        setError(nextError);
        if (mode !== "background") {
          pushFeedback("error", "进程列表更新失败", nextError.message);
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }

        if (usesVisibleRefreshState(mode)) {
          setIsRefreshing(false);
        }
      }
    },
    [pushFeedback]
  );

  useEffect(() => {
    if (previewMode) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void refresh("background");
    }, autoRefreshIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefreshIntervalMs, previewMode, refresh]);

  const terminate = useCallback(
    async (item: ProcessItem) => {
      setTerminatingPid(item.pid);

      try {
        const result = await terminateProcess(item.pid);
        setError(null);
        pushFeedback("success", "最近动作", `已结束 ${result.name}（${result.pid}）`);
        await refresh("background");
        return true;
      } catch (cause) {
        const nextError = toProcessApiError(cause);
        setError(nextError);
        pushFeedback("error", "结束进程失败", nextError.message);
        return false;
      } finally {
        setTerminatingPid(null);
      }
    },
    [pushFeedback, refresh]
  );

  const dismissFeedback = useCallback((feedbackId: number) => {
    setFeedback((current) => {
      if (!current || current.id !== feedbackId) {
        return current;
      }

      return null;
    });
  }, []);

  const state = useMemo(
    () => ({
      items,
      error,
      isLoading,
      isRefreshing,
      terminatingPid,
      lastRefresh,
      feedback
    }),
    [items, error, isLoading, isRefreshing, terminatingPid, lastRefresh, feedback]
  );

  return {
    ...state,
    refresh,
    terminate,
    dismissFeedback
  };
}
