import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import {
  autoUpdater,
  type ProgressInfo,
  type UpdateInfo
} from "electron-updater";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import { commandError, commandOk } from "./result.cjs";

const RELEASE_PAGE_URL =
  "https://github.com/ZhcChen/App-Manager/releases/latest";
const RELEASE_TAG_URL_PREFIX =
  "https://github.com/ZhcChen/App-Manager/releases/tag/";
const RELEASE_DOWNLOAD_URL_PREFIX =
  "/ZhcChen/App-Manager/releases/download/";
const RELEASE_CHECK_TIMEOUT_MS = 10_000;
const INSTALL_TRIGGER_DELAY_MS = 800;
const MAC_SIGNATURE_CHECK_BINARY = "/usr/bin/codesign";
const MANUAL_INSTALLER_DIR_NAME = "App Manager Updates";

type UpdatePlatform = "macos" | "windows" | "linux" | "unknown";
type UpdateArch = "x64" | "arm64" | "unknown";
type UpdateAssetFormat = "dmg" | "exe" | "appimage" | "deb" | "zip" | "unknown";

export type UpdateReleaseAsset = {
  name: string;
  url: string;
  platform: UpdatePlatform;
  arch: UpdateArch;
  format: UpdateAssetFormat;
  isCurrentPlatform: boolean;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  hasUpdate: boolean;
  releaseName: string | null;
  releaseUrl: string | null;
  releaseNotes: string;
  publishedAt: string | null;
  checkedAt: string;
  currentPlatform: UpdatePlatform;
  currentArch: UpdateArch;
  assets: UpdateReleaseAsset[];
  currentPlatformAssets: UpdateReleaseAsset[];
};

export type UpdateInstallPhase =
  | "idle"
  | "checking"
  | "downloading"
  | "downloaded"
  | "installing"
  | "failed";

export type UpdateInstallState = {
  phase: UpdateInstallPhase;
  version: string | null;
  progressPercent: number;
  transferredBytes: number | null;
  totalBytes: number | null;
  bytesPerSecond: number | null;
  message: string | null;
};

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type ReleasePageSnapshot = {
  html: string;
  finalUrl: string;
};

const DEFAULT_UPDATE_INSTALL_STATE: UpdateInstallState = {
  phase: "idle",
  version: null,
  progressPercent: 0,
  transferredBytes: null,
  totalBytes: null,
  bytesPerSecond: null,
  message: null
};

const isDevRuntime =
  !app.isPackaged || process.env.APP_MANAGER_CHANNEL === "dev";

let currentInstallState: UpdateInstallState = DEFAULT_UPDATE_INSTALL_STATE;
let updateLifecycleBound = false;
let installScheduled = false;
let installInFlight = false;
let cachedMacAutoInstallSupport: boolean | null = null;
let manualMacInstallInFlight = false;

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

function parseVersion(version: string): ParsedVersion {
  const [withoutBuild] = normalizeVersion(version).split("+", 1);
  const prereleaseStart = withoutBuild.indexOf("-");
  const mainVersion =
    prereleaseStart === -1 ? withoutBuild : withoutBuild.slice(0, prereleaseStart);
  const prereleaseVersion =
    prereleaseStart === -1 ? "" : withoutBuild.slice(prereleaseStart + 1);
  const [major = 0, minor = 0, patch = 0] = mainVersion
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

  return {
    major,
    minor,
    patch,
    prerelease: prereleaseVersion ? prereleaseVersion.split(".") : []
  };
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
  const leftNumber = /^[0-9]+$/.test(left) ? Number.parseInt(left, 10) : null;
  const rightNumber = /^[0-9]+$/.test(right) ? Number.parseInt(right, 10) : null;

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  if (leftNumber !== null) {
    return -1;
  }

  if (rightNumber !== null) {
    return 1;
  }

  return left.localeCompare(right, "en-US");
}

export function compareVersions(leftVersion: string, rightVersion: string): number {
  const leftParts = parseVersion(leftVersion);
  const rightParts = parseVersion(rightVersion);

  for (const key of ["major", "minor", "patch"] as const) {
    const result = leftParts[key] - rightParts[key];

    if (result !== 0) {
      return result;
    }
  }

  if (!leftParts.prerelease.length && rightParts.prerelease.length) {
    return 1;
  }

  if (leftParts.prerelease.length && !rightParts.prerelease.length) {
    return -1;
  }

  const prereleaseLength = Math.max(
    leftParts.prerelease.length,
    rightParts.prerelease.length
  );

  for (let index = 0; index < prereleaseLength; index += 1) {
    const left = leftParts.prerelease[index];
    const right = rightParts.prerelease[index];

    if (left === undefined) {
      return -1;
    }

    if (right === undefined) {
      return 1;
    }

    const result = comparePrereleaseIdentifiers(left, right);
    if (result !== 0) {
      return result;
    }
  }

  return 0;
}

function detectPlatform(fileName: string): UpdatePlatform {
  if (fileName.includes("-mac-")) {
    return "macos";
  }

  if (fileName.includes("-win-")) {
    return "windows";
  }

  if (fileName.includes("-linux-")) {
    return "linux";
  }

  return "unknown";
}

function detectArch(fileName: string): UpdateArch {
  if (fileName.includes("-arm64.") || fileName.includes("-aarch64.")) {
    return "arm64";
  }

  if (
    fileName.includes("-x64.") ||
    fileName.includes("-amd64.") ||
    fileName.includes("-x86_64.")
  ) {
    return "x64";
  }

  return "unknown";
}

function detectFormat(fileName: string): UpdateAssetFormat {
  if (fileName.endsWith(".appimage")) {
    return "appimage";
  }

  if (fileName.endsWith(".deb")) {
    return "deb";
  }

  if (fileName.endsWith(".dmg")) {
    return "dmg";
  }

  if (fileName.endsWith(".exe")) {
    return "exe";
  }

  if (fileName.endsWith(".zip")) {
    return "zip";
  }

  return "unknown";
}

function getPreferredAssetFormatsForPlatform(
  platform: UpdatePlatform
): UpdateAssetFormat[] {
  if (platform === "macos") {
    return ["dmg", "zip"];
  }

  if (platform === "windows") {
    return ["exe"];
  }

  if (platform === "linux") {
    return ["appimage", "deb"];
  }

  return [];
}

function getCurrentPlatform(): UpdatePlatform {
  if (process.platform === "darwin") {
    return "macos";
  }

  if (process.platform === "win32") {
    return "windows";
  }

  if (process.platform === "linux") {
    return "linux";
  }

  return "unknown";
}

function getCurrentArch(): UpdateArch {
  if (process.arch === "arm64") {
    return "arm64";
  }

  if (process.arch === "x64") {
    return "x64";
  }

  return "unknown";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createReleaseAsset(
  name: string,
  url: string
): UpdateReleaseAsset | null {
  if (!isAllowedDownloadUrl(url)) {
    return null;
  }

  const normalizedName = name.toLowerCase();
  const platform = detectPlatform(normalizedName);
  const arch = detectArch(normalizedName);
  const format = detectFormat(normalizedName);

  if (platform === "unknown" || arch === "unknown" || format === "unknown") {
    return null;
  }

  return {
    name,
    url,
    platform,
    arch,
    format,
    isCurrentPlatform:
      platform === getCurrentPlatform() && arch === getCurrentArch()
  };
}

export function toReleaseAsset(asset: unknown): UpdateReleaseAsset | null {
  if (!isObjectRecord(asset)) {
    return null;
  }

  if (typeof asset.name !== "string") {
    return null;
  }

  if (typeof asset.browser_download_url !== "string") {
    return null;
  }

  return createReleaseAsset(asset.name, asset.browser_download_url);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLatestTag(snapshot: ReleasePageSnapshot): string {
  const finalUrlMatch = snapshot.finalUrl.match(/\/releases\/tag\/(v[^/?#]+)/i);
  if (finalUrlMatch?.[1]) {
    return finalUrlMatch[1];
  }

  const htmlMatch = snapshot.html.match(
    /(?:og:url" content="|apple-itunes-app" content="[^"]*app-argument=)\/?ZhcChen\/App-Manager\/releases\/tag\/(v[^"&<]+)/i
  );
  if (htmlMatch?.[1]) {
    return htmlMatch[1];
  }

  throw new Error("GitHub release page is missing tag_name.");
}

function extractReleaseDate(snapshot: ReleasePageSnapshot): string | null {
  const match = snapshot.html.match(/<relative-time[^>]+datetime="([^"]+)"/i);
  return match?.[1] ?? null;
}

function extractReleaseAssetUrls(
  snapshot: ReleasePageSnapshot,
  latestTag: string
): string[] {
  const assetUrls = new Set<string>();
  const assetUrlPattern = new RegExp(
    `https://github\\.com/ZhcChen/App-Manager/releases/download/${escapeRegExp(latestTag)}/[^"<\\s]+`,
    "g"
  );

  for (const match of snapshot.html.matchAll(assetUrlPattern)) {
    assetUrls.add(match[0]);
  }

  return [...assetUrls];
}

function toReleaseAssetFromUrl(url: string): UpdateReleaseAsset | null {
  try {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split("/");
    const name = decodeURIComponent(segments[segments.length - 1] ?? "");
    if (!name) {
      return null;
    }

    return createReleaseAsset(name, url);
  } catch {
    return null;
  }
}

export function releasePageToResult(
  snapshot: ReleasePageSnapshot
): UpdateCheckResult {
  const currentVersion = app.getVersion();
  const latestTag = extractLatestTag(snapshot);
  const latestVersion = normalizeVersion(latestTag);
  const assets = extractReleaseAssetUrls(snapshot, latestTag)
    .map((url) => toReleaseAssetFromUrl(url))
    .filter((asset): asset is UpdateReleaseAsset => asset !== null);

  if (!assets.length) {
    throw new Error("GitHub release page is missing assets.");
  }

  const currentPlatformAssets = assets.filter((asset) => asset.isCurrentPlatform);

  return {
    currentVersion,
    latestVersion,
    latestTag,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    releaseName: `App Manager ${latestTag}`,
    releaseUrl: `${RELEASE_TAG_URL_PREFIX}${latestTag}`,
    releaseNotes: "",
    publishedAt: extractReleaseDate(snapshot),
    checkedAt: new Date().toISOString(),
    currentPlatform: getCurrentPlatform(),
    currentArch: getCurrentArch(),
    assets,
    currentPlatformAssets
  };
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RELEASE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(RELEASE_PAGE_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "App-Manager"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`GitHub release page returned ${response.status}.`);
    }

    return releasePageToResult({
      html: await response.text(),
      finalUrl: response.url
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function isAllowedDownloadUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "github.com" &&
      parsedUrl.pathname.startsWith(RELEASE_DOWNLOAD_URL_PREFIX)
    );
  } catch {
    return false;
  }
}

function formatUpdateErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "GitHub release page request timed out.";
  }

  return error instanceof Error ? error.message : "Failed to check updates.";
}

function formatInstallErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/did not pass validation|code signature/i.test(message)) {
    return "当前安装包的签名校验未通过，已无法直接完成应用内覆盖安装。";
  }

  return message || "升级失败。";
}

function buildInstallState(
  partial: Partial<UpdateInstallState>
): UpdateInstallState {
  return {
    ...DEFAULT_UPDATE_INSTALL_STATE,
    ...currentInstallState,
    ...partial
  };
}

function broadcastInstallState() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue;
    }

    window.webContents.send(
      DESKTOP_CHANNELS.updateInstallStateChanged,
      currentInstallState
    );
  }
}

function updateInstallState(partial: Partial<UpdateInstallState>) {
  currentInstallState = buildInstallState(partial);
  broadcastInstallState();
}

function resetInstallFlow() {
  installScheduled = false;
  installInFlight = false;
  manualMacInstallInFlight = false;
}

async function supportsMacAutoInstall(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return true;
  }

  if (cachedMacAutoInstallSupport !== null) {
    return cachedMacAutoInstallSupport;
  }

  try {
    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        MAC_SIGNATURE_CHECK_BINARY,
        ["-dv", "--verbose=4", process.execPath],
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(`${stdout}\n${stderr}`);
        }
      );
    });
    const hasAuthority = /Authority=/i.test(result);
    const isAdHoc = /Signature=adhoc/i.test(result);

    cachedMacAutoInstallSupport = hasAuthority && !isAdHoc;
  } catch {
    cachedMacAutoInstallSupport = false;
  }

  return cachedMacAutoInstallSupport;
}

function pickPreferredCurrentPlatformAsset(
  result: UpdateCheckResult
): UpdateReleaseAsset | null {
  const preferredFormats = getPreferredAssetFormatsForPlatform(
    result.currentPlatform
  );

  for (const format of preferredFormats) {
    const asset = result.currentPlatformAssets.find(
      (candidate) => candidate.format === format
    );

    if (asset) {
      return asset;
    }
  }

  return result.currentPlatformAssets[0] ?? null;
}

function createManualInstallerPath(asset: UpdateReleaseAsset) {
  return path.join(app.getPath("downloads"), MANUAL_INSTALLER_DIR_NAME, asset.name);
}

async function downloadReleaseAssetToFile(
  asset: UpdateReleaseAsset,
  version: string | null
): Promise<string> {
  const targetPath = createManualInstallerPath(asset);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await rm(targetPath, { force: true });

  const response = await fetch(asset.url, {
    headers: {
      accept: "*/*",
      "user-agent": "App-Manager"
    }
  });

  if (!response.ok || !response.body) {
    throw new Error(`更新包下载失败（${response.status}）。`);
  }

  const totalBytesHeader = response.headers.get("content-length");
  const totalBytes =
    totalBytesHeader !== null ? Number.parseInt(totalBytesHeader, 10) || null : null;
  const fileStream = createWriteStream(targetPath);
  const reader = response.body.getReader();
  let transferredBytes = 0;
  const startedAt = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = Buffer.from(value);

      await new Promise<void>((resolve, reject) => {
        fileStream.write(chunk, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      transferredBytes += chunk.length;
      const elapsedSeconds = Math.max((Date.now() - startedAt) / 1_000, 0.25);
      const progressPercent = totalBytes
        ? Math.max(1, Math.min(100, Math.round((transferredBytes / totalBytes) * 100)))
        : 0;

      updateInstallState({
        phase: "downloading",
        version,
        progressPercent,
        transferredBytes,
        totalBytes,
        bytesPerSecond: Math.round(transferredBytes / elapsedSeconds),
        message: "正在下载更新包..."
      });
    }
  } catch (error) {
    fileStream.destroy();
    await rm(targetPath, { force: true });
    throw error;
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.end((error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return targetPath;
}

async function openManualInstaller(assetPath: string) {
  const openError = await shell.openPath(assetPath);

  if (openError) {
    throw new Error(openError);
  }
}

async function startManualMacUpdateInstall(initialMessage: string) {
  updateInstallState({
    phase: "checking",
    version: null,
    progressPercent: 0,
    transferredBytes: null,
    totalBytes: null,
    bytesPerSecond: null,
    message: initialMessage
  });

  const result = await checkForUpdates();

  if (!result.hasUpdate) {
    throw new Error("当前已经是最新版本。");
  }

  const asset = pickPreferredCurrentPlatformAsset(result);

  if (!asset) {
    throw new Error("当前设备暂无可用安装包。");
  }

  updateInstallState({
    phase: "checking",
    version: result.latestVersion,
    progressPercent: 0,
    transferredBytes: null,
    totalBytes: null,
    bytesPerSecond: null,
    message: "当前 macOS 版本将下载并自动打开安装器。"
  });

  const installerPath = await downloadReleaseAssetToFile(asset, result.latestVersion);

  updateInstallState({
    phase: "installing",
    version: result.latestVersion,
    progressPercent: 100,
    message: "更新包已下载，正在打开安装器..."
  });

  await openManualInstaller(installerPath);

  updateInstallState({
    phase: "installing",
    version: result.latestVersion,
    progressPercent: 100,
    message:
      "安装器已打开，请完成覆盖安装；安装完成后重新打开应用即可进入新版本。"
  });
}

function shouldFallbackToManualMacInstaller(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /did not pass validation|code signature/i.test(message);
}

async function fallbackToManualMacInstaller(initialMessage: string) {
  if (manualMacInstallInFlight) {
    return;
  }

  manualMacInstallInFlight = true;
  installScheduled = false;

  try {
    await startManualMacUpdateInstall(initialMessage);
    installInFlight = false;
    manualMacInstallInFlight = false;
  } catch (error) {
    resetInstallFlow();
    updateInstallState({
      phase: "failed",
      progressPercent: 0,
      message: formatInstallErrorMessage(error)
    });
    throw error;
  }
}

function bindUpdateLifecycle() {
  if (updateLifecycleBound) {
    return;
  }

  updateLifecycleBound = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    updateInstallState({
      phase: "checking",
      progressPercent: 0,
      transferredBytes: null,
      totalBytes: null,
      bytesPerSecond: null,
      message: "正在检查可用更新..."
    });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    updateInstallState({
      phase: "downloading",
      version: info.version,
      progressPercent: 0,
      transferredBytes: 0,
      totalBytes: null,
      bytesPerSecond: null,
      message: "已发现新版本，正在开始下载..."
    });
  });

  autoUpdater.on("download-progress", (info: ProgressInfo) => {
    updateInstallState({
      phase: "downloading",
      progressPercent: Math.max(0, Math.min(100, Math.round(info.percent))),
      transferredBytes: info.transferred,
      totalBytes: info.total,
      bytesPerSecond: info.bytesPerSecond,
      message: "正在下载更新..."
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    updateInstallState({
      phase: "downloaded",
      version: info.version,
      progressPercent: 100,
      message: "更新已下载完成，正在准备安装..."
    });

    if (installScheduled) {
      return;
    }

    installScheduled = true;
    updateInstallState({
      phase: "installing",
      progressPercent: 100,
      message: "正在启动安装程序，应用即将退出..."
    });

    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall();
      } catch (error) {
        resetInstallFlow();
        updateInstallState({
          phase: "failed",
          message:
            error instanceof Error
              ? error.message
              : "Failed to launch installer."
        });
      }
    }, INSTALL_TRIGGER_DELAY_MS);
  });

  autoUpdater.on("update-not-available", () => {
    resetInstallFlow();
    updateInstallState({
      phase: "failed",
      progressPercent: 0,
      message: "当前已经是最新版本。"
    });
  });

  autoUpdater.on("error", (error: Error) => {
    if (
      process.platform === "darwin" &&
      shouldFallbackToManualMacInstaller(error)
    ) {
      void fallbackToManualMacInstaller(
        "当前安装包的签名不支持应用内覆盖安装，正在切换为安装器升级..."
      );
      return;
    }

    resetInstallFlow();
    updateInstallState({
      phase: "failed",
      progressPercent: 0,
      message: formatInstallErrorMessage(error)
    });
  });
}

function ensureUpdateInstallSupported() {
  if (isDevRuntime) {
    throw new Error("Dev 环境不支持应用内升级安装。");
  }
}

export async function startUpdateInstall() {
  ensureUpdateInstallSupported();
  bindUpdateLifecycle();

  if (installInFlight) {
    return;
  }

  installInFlight = true;

  try {
    if (process.platform === "darwin" && !(await supportsMacAutoInstall())) {
      await fallbackToManualMacInstaller(
        "当前 macOS 版本将下载并自动打开安装器。"
      );
      return;
    }

    const result = await autoUpdater.checkForUpdates();

    if (!result?.isUpdateAvailable) {
      throw new Error("当前已经是最新版本。");
    }

    await autoUpdater.downloadUpdate();
  } catch (error) {
    if (
      process.platform === "darwin" &&
      shouldFallbackToManualMacInstaller(error)
    ) {
      await fallbackToManualMacInstaller(
        "当前安装包的签名不支持应用内覆盖安装，正在切换为安装器升级..."
      );
      return;
    }

    resetInstallFlow();
    updateInstallState({
      phase: "failed",
      progressPercent: 0,
      message: formatInstallErrorMessage(error)
    });
    throw error;
  } finally {
    if (currentInstallState.phase === "failed") {
      resetInstallFlow();
    }
  }
}

export function getUpdateInstallState(): UpdateInstallState {
  return currentInstallState;
}

export function registerUpdateHandlers() {
  bindUpdateLifecycle();

  ipcMain.handle(DESKTOP_CHANNELS.checkForUpdates, async () => {
    try {
      return commandOk(await checkForUpdates());
    } catch (error) {
      return commandError({
        code: "update_check_failed",
        message: formatUpdateErrorMessage(error)
      });
    }
  });

  ipcMain.handle(DESKTOP_CHANNELS.getUpdateInstallState, async () => {
    return commandOk(getUpdateInstallState());
  });

  ipcMain.handle(DESKTOP_CHANNELS.startUpdateInstall, async () => {
    try {
      await startUpdateInstall();
      return commandOk(null);
    } catch (error) {
      return commandError({
        code: "update_install_failed",
        message: formatInstallErrorMessage(error)
      });
    }
  });
}
