import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const electronCliPath = require.resolve("electron/cli.js");
const rendererUrl =
  process.env.ELECTRON_RENDERER_URL ?? "http://127.0.0.1:1430";

const electronProcess = spawn(
  process.execPath,
  [electronCliPath, "dist-electron/main.cjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      APP_MANAGER_CHANNEL: "dev",
      ELECTRON_RENDERER_URL: rendererUrl
    }
  }
);

electronProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
