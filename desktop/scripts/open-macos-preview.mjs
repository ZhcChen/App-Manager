import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const releaseDir = path.join(desktopRoot, "release");
const expectedAppName = "App Manager.app";

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

const appBundlePath = await findAppBundle(releaseDir);

if (!appBundlePath) {
  console.error(`Could not find ${expectedAppName} under ${releaseDir}`);
  process.exit(1);
}

const openProcess = spawn("open", ["-n", appBundlePath], {
  stdio: "inherit"
});

openProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
