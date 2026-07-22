export type DesktopBootstrap = {
  appName: string;
  runtime: "browser" | "tauri";
  shell: "desktop";
};

const FALLBACK_STATE: DesktopBootstrap = {
  appName: "App Manager",
  runtime: "browser",
  shell: "desktop"
};

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export async function loadDesktopBootstrap(): Promise<DesktopBootstrap> {
  if (typeof window === "undefined") {
    return FALLBACK_STATE;
  }

  if (!isTauriRuntime()) {
    return FALLBACK_STATE;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DesktopBootstrap>("bootstrap_state");
  } catch {
    return {
      ...FALLBACK_STATE,
      runtime: "tauri"
    };
  }
}
