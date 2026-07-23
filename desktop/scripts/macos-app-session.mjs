import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const APP_DISPLAY_NAME = "App Manager";
const APP_BUNDLE_ID = "com.zhcchen.app-manager";
const EXPECTED_APP_NAME = "App Manager.app";
const APP_PROCESS_PATTERN = `${EXPECTED_APP_NAME}/Contents/MacOS/${APP_DISPLAY_NAME}`;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function hasRunningPreviewInstance() {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-f", APP_PROCESS_PATTERN]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function quitExistingPreviewApp() {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    await execFileAsync("osascript", [
      "-e",
      `tell application id "${APP_BUNDLE_ID}" to quit`
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
    await execFileAsync("pkill", ["-f", APP_PROCESS_PATTERN]);
  } catch {
    // Best effort cleanup only.
  }
}
