import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isElectronRuntime } from "@/lib/desktopRuntime";
import {
  AUTO_REFRESH_INTERVAL_MS,
  type AutoRefreshIntervalMs,
  type RefreshMode,
  usesVisibleRefreshState
} from "@/features/processes/refresh-policy";
import type {
  ProcessApiError,
  ProcessFeedback
} from "@/features/processes/types";
import { listApplications, terminateProcesses, toApplicationApiError } from "./api";
import { mockApplications } from "./mockApplications";
import type {
  ApplicationGroupItem,
  TerminateProcessesResult
} from "./types";

function formatRefreshTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

export function useApplications(
  autoRefreshIntervalMs: AutoRefreshIntervalMs = AUTO_REFRESH_INTERVAL_MS
) {
  const previewMode = !isElectronRuntime();
  const [items, setItems] = useState<ApplicationGroupItem[]>(
    previewMode ? mockApplications : []
  );
  const [error, setError] = useState<ProcessApiError | null>(null);
  const [isLoading, setIsLoading] = useState(!previewMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminatingTargetId, setTerminatingTargetId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(
    previewMode ? formatRefreshTime() : "--:--:--"
  );
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
        const next = await listApplications();
        setItems(next);
        setError(null);
        setLastRefresh(formatRefreshTime());
        if (mode === "manual") {
          pushFeedback("success", "最近动作", `已刷新 ${next.length} 个应用组`);
        }
      } catch (cause) {
        const nextError = toApplicationApiError(cause);
        setError(nextError);
        if (mode !== "background") {
          pushFeedback("error", "应用树更新失败", nextError.message);
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
    async (target: {
      id: string;
      name: string;
      pids: number[];
    }): Promise<TerminateProcessesResult | null> => {
      setTerminatingTargetId(target.id);

      try {
        const result = await terminateProcesses(target.pids);
        setError(null);

        if (result.failedCount === 0) {
          pushFeedback(
            "success",
            "最近动作",
            `已结束 ${target.name} 的 ${result.terminatedCount} 个进程`
          );
        } else {
          pushFeedback(
            "error",
            "结束应用失败",
            `已结束 ${result.terminatedCount} 个进程，${result.failedCount} 个失败`
          );
        }

        await refresh("background");
        return result;
      } catch (cause) {
        const nextError = toApplicationApiError(cause);
        setError(nextError);
        pushFeedback("error", "结束应用失败", nextError.message);
        return null;
      } finally {
        setTerminatingTargetId(null);
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
      terminatingTargetId,
      lastRefresh,
      feedback
    }),
    [
      items,
      error,
      isLoading,
      isRefreshing,
      terminatingTargetId,
      lastRefresh,
      feedback
    ]
  );

  return {
    ...state,
    refresh,
    terminate,
    dismissFeedback
  };
}
