import { app, ipcMain, shell } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import { commandError, commandOk } from "./result.cjs";

const RELEASE_PAGE_URL =
  "https://github.com/ZhcChen/App-Manager/releases/latest";
const RELEASE_TAG_URL_PREFIX =
  "https://github.com/ZhcChen/App-Manager/releases/tag/";
const RELEASE_DOWNLOAD_URL_PREFIX =
  "/ZhcChen/App-Manager/releases/download/";
const RELEASE_CHECK_TIMEOUT_MS = 10_000;

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

export function registerUpdateHandlers() {
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

  ipcMain.handle(DESKTOP_CHANNELS.openUpdateDownload, async (_event, url: string) => {
    if (typeof url !== "string" || !isAllowedDownloadUrl(url)) {
      return commandError({
        code: "invalid_download_url",
        message: "The update download URL is not allowed."
      });
    }

    try {
      await shell.openExternal(url);
      return commandOk(null);
    } catch (error) {
      return commandError({
        code: "open_download_failed",
        message:
          error instanceof Error ? error.message : "Failed to open download URL."
      });
    }
  });
}
