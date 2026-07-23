import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const forwardedArgs = process.argv.slice(2);

if (forwardedArgs[0] === "--") {
  forwardedArgs.shift();
}

const builderArgs = [
  "exec",
  "electron-builder",
  "--config",
  "electron-builder.yml",
  "--publish",
  "never",
  ...forwardedArgs
];

const child = spawn(pnpmCommand, builderArgs, {
  cwd: desktopRoot,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error("Failed to start electron-builder:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
