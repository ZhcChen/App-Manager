import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const defaultSourceDir = path.join(desktopRoot, "release");
const defaultTargetDir = path.resolve(desktopRoot, "..", ".artifacts", "release-assets");
const packageJsonPath = path.join(desktopRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentVersion = String(packageJson.version);
const supportedExtensions = new Set([
  ".appimage",
  ".deb",
  ".dmg",
  ".exe",
]);

async function collectAssetFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectAssetFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      continue;
    }

    const normalizedName = entry.name.toLowerCase();
    if (!normalizedName.includes(`-${currentVersion.toLowerCase()}-`)) {
      continue;
    }

    if (
      !normalizedName.includes("-mac-") &&
      !normalizedName.includes("-win-") &&
      !normalizedName.includes("-linux-")
    ) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

const sourceDir = path.resolve(process.argv[2] ?? defaultSourceDir);
const targetDir = path.resolve(process.argv[3] ?? defaultTargetDir);
const assetFiles = await collectAssetFiles(sourceDir);

if (!assetFiles.length) {
  throw new Error(`No release assets found in ${sourceDir}.`);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const assetFile of assetFiles) {
  const targetPath = path.join(targetDir, path.basename(assetFile));
  await copyFile(assetFile, targetPath);
}

console.log(`Collected ${assetFiles.length} release assets into ${targetDir}`);
