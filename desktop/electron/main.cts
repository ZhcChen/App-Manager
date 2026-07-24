import path from "node:path";
import { app, BrowserWindow, nativeImage } from "electron";
import { resolvePngBrandIconPath, shouldApplyDockIcon } from "./branding.cjs";
import { registerBootstrapHandlers } from "./ipc/bootstrap.cjs";
import { registerProcessHandlers } from "./ipc/processes.cjs";
import { registerUpdateHandlers } from "./ipc/updates.cjs";

const isDevRuntime = !app.isPackaged || process.env.APP_MANAGER_CHANNEL === "dev";
const APP_DISPLAY_NAME = isDevRuntime ? "App Manager Dev" : "App Manager";
const APP_USER_MODEL_ID = isDevRuntime
  ? "com.zhcchen.app-manager.dev"
  : "com.zhcchen.app-manager";

function resolveRendererEntry() {
  return process.env.ELECTRON_RENDERER_URL ?? null;
}

function resolveCurrentPngBrandIconPath() {
  return resolvePngBrandIconPath({
    isDevRuntime,
    isPackaged: app.isPackaged,
    moduleDir: __dirname,
    resourcesPath: process.resourcesPath
  });
}

function applyRuntimeBrandIcon() {
  const dock = app.dock;

  if (!dock || !shouldApplyDockIcon(process.platform, true)) {
    return;
  }

  const icon = nativeImage.createFromPath(resolveCurrentPngBrandIconPath());
  if (icon.isEmpty()) {
    return;
  }

  dock.setIcon(icon);
}

function createMainWindow() {
  const windowIcon =
    process.platform === "darwin" ? undefined : resolveCurrentPngBrandIconPath();
  const window = new BrowserWindow({
    width: 1360,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: APP_DISPLAY_NAME,
    backgroundColor: "#ffffff",
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  const rendererUrl = resolveRendererEntry();
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
    return window;
  }

  void window.loadFile(path.join(__dirname, "../dist/index.html"));
  return window;
}

app.setName(APP_DISPLAY_NAME);
app.setAppUserModelId(APP_USER_MODEL_ID);

if (isDevRuntime) {
  app.setPath("userData", path.join(app.getPath("appData"), APP_DISPLAY_NAME));
}

const acquiredSingleInstanceLock = app.requestSingleInstanceLock();

if (!acquiredSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const existingWindow = BrowserWindow.getAllWindows()[0];
    if (!existingWindow) {
      return;
    }

    if (existingWindow.isMinimized()) {
      existingWindow.restore();
    }

    existingWindow.focus();
  });

  app.whenReady().then(() => {
    applyRuntimeBrandIcon();
    registerBootstrapHandlers();
    registerProcessHandlers();
    registerUpdateHandlers();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
