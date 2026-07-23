import { readdir } from "node:fs/promises";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const releaseDir = path.join(desktopRoot, "release");
const appDisplayName = "App Manager";
const expectedAppName = "App Manager.app";
const appProcessPattern = `${expectedAppName}/Contents/MacOS/${appDisplayName}`;

async function findAppBundle(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name === expectedAppName) {
      return fullPath;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const nested = await findAppBundle(path.join(dir, entry.name));
    if (nested) {
      return nested;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function hasRunningPreviewInstance() {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-f", appProcessPattern]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function quitExistingPreviewApp() {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    await execFileAsync("osascript", [
      "-e",
      `tell application "${appDisplayName}" to quit`
    ]);
  } catch {
    // Ignore "application isn't running" and keep going.
  }

  for (let index = 0; index < 20; index += 1) {
    if (!(await hasRunningPreviewInstance())) {
      return;
    }

    await sleep(250);
  }

  try {
    await execFileAsync("pkill", ["-f", appProcessPattern]);
  } catch {
    // Best effort cleanup only.
  }
}

const appBundlePath = await findAppBundle(releaseDir);

if (!appBundlePath) {
  console.error(`Could not find ${expectedAppName} under ${releaseDir}`);
  process.exit(1);
}

await quitExistingPreviewApp();

const openProcess = spawn("open", ["-n", appBundlePath], {
  stdio: "inherit"
});

openProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
