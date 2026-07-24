import { useCallback, useEffect, useRef, useState } from "react";
import { isElectronRuntime } from "@/lib/desktopRuntime";
import {
  getUpdateInstallState,
  startUpdateInstall,
  subscribeToUpdateInstallState
} from "./api";
import {
  createIdleUpdateInstallState,
  type UpdateInstallState
} from "./types";

export function useUpdateInstall() {
  const [state, setState] = useState<UpdateInstallState>(
    createIdleUpdateInstallState()
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isElectronRuntime()) {
      return undefined;
    }

    void getUpdateInstallState().then((next) => {
      if (!mountedRef.current) {
        return;
      }

      setState(next);
    });

    return subscribeToUpdateInstallState((next) => {
      if (!mountedRef.current) {
        return;
      }

      setState(next);
    });
  }, []);

  const start = useCallback(async () => {
    await startUpdateInstall();
  }, []);

  return {
    state,
    start
  };
}
