import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isElectronRuntime } from "@/lib/desktopRuntime";
import { checkForUpdates, toUpdateApiError } from "./api";
import type { UpdateCheckReason, UpdateCheckResult } from "./types";

const UPDATE_CHECK_INTERVAL_MS = 60_000;
const UPDATE_FOCUS_MIN_CADENCE_MS = 30_000;

export function useUpdateCheck(currentVersion: string) {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCheckStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const check = useCallback(
    async (reason: UpdateCheckReason = "manual") => {
      if (checkingRef.current) {
        return null;
      }

      if (
        reason === "focus" &&
        lastCheckStartedAtRef.current !== null &&
        Date.now() - lastCheckStartedAtRef.current < UPDATE_FOCUS_MIN_CADENCE_MS
      ) {
        return null;
      }

      lastCheckStartedAtRef.current = Date.now();
      checkingRef.current = true;
      setIsChecking(true);

      try {
        const next = await checkForUpdates(currentVersion);
        if (isMountedRef.current) {
          setResult(next);
          setError(null);
        }
        return next;
      } catch (cause) {
        if (isMountedRef.current) {
          setError(toUpdateApiError(cause).message);
        }
        return null;
      } finally {
        checkingRef.current = false;
        if (isMountedRef.current) {
          setIsChecking(false);
        }
      }
    },
    [currentVersion]
  );

  useEffect(() => {
    if (!isElectronRuntime()) {
      return undefined;
    }

    void check("initial");

    const timer = window.setInterval(() => {
      void check("interval");
    }, UPDATE_CHECK_INTERVAL_MS);

    const handleFocus = () => {
      void check("focus");
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [check]);

  const state = useMemo(
    () => ({
      result,
      error,
      isChecking,
      hasUpdate: result?.hasUpdate ?? false
    }),
    [error, isChecking, result]
  );

  return {
    ...state,
    check
  };
}
