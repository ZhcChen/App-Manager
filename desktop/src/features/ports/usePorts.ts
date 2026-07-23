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
import { toProcessApiError } from "@/features/processes/api";
import { listPorts } from "./api";
import { mockPorts } from "./mockPorts";
import type { PortBindingItem } from "./types";

function formatRefreshTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

export function usePorts(
  autoRefreshIntervalMs: AutoRefreshIntervalMs = AUTO_REFRESH_INTERVAL_MS
) {
  const previewMode = !isElectronRuntime();
  const [items, setItems] = useState<PortBindingItem[]>(previewMode ? mockPorts : []);
  const [error, setError] = useState<ProcessApiError | null>(null);
  const [isLoading, setIsLoading] = useState(!previewMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    async (
      mode: RefreshMode = "manual",
      options: {
        reportFailure?: boolean;
      } = {}
    ) => {
      const reportFailure = options.reportFailure ?? mode !== "background";
      setError(null);

      if (mode === "initial") {
        setIsLoading(true);
      } else if (usesVisibleRefreshState(mode)) {
        setIsRefreshing(true);
      }

      try {
        const next = await listPorts();
        setItems(next);
        setError(null);
        setLastRefresh(formatRefreshTime());
        if (mode === "manual") {
          pushFeedback("success", "最近动作", `已刷新 ${next.length} 个端口占用`);
        }
      } catch (cause) {
        const nextError = toProcessApiError(cause);
        setError(nextError);
        if (reportFailure) {
          pushFeedback("error", "端口列表更新失败", nextError.message);
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
      lastRefresh,
      feedback
    }),
    [items, error, isLoading, isRefreshing, lastRefresh, feedback]
  );

  return {
    ...state,
    refresh,
    dismissFeedback
  };
}
