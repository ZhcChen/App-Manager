import path from "node:path";
import { app, BrowserWindow } from "electron";
import { registerBootstrapHandlers } from "./ipc/bootstrap.cjs";
import { registerProcessHandlers } from "./ipc/processes.cjs";

function resolveRendererEntry() {
  return process.env.ELECTRON_RENDERER_URL ?? null;
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: "App Manager",
    backgroundColor: "#edf0f5",
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

app.whenReady().then(() => {
  registerBootstrapHandlers();
  registerProcessHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
