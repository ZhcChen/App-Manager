import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const defaultSourceDir = path.join(desktopRoot, "release");
const defaultTargetDir = path.resolve(desktopRoot, "..", ".artifacts", "release-assets");
const supportedExtensions = new Set([
  ".appimage",
  ".blockmap",
  ".deb",
  ".dmg",
  ".exe",
  ".yml",
  ".yaml",
  ".zip"
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

    if (
      (extension === ".yml" || extension === ".yaml") &&
      !entry.name.toLowerCase().startsWith("latest")
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
