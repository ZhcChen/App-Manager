import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const defaultSourceDir = path.join(desktopRoot, "release");
const defaultTargetDir = path.resolve(
  desktopRoot,
  "..",
  ".artifacts",
  "release-assets"
);
const packageJsonPath = path.join(desktopRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentVersion = String(packageJson.version).toLowerCase();
const supportedInstallerExtensions = new Set([
  ".appimage",
  ".deb",
  ".dmg",
  ".exe",
  ".zip"
]);

function isInstallerAssetName(fileName) {
  const normalizedName = fileName.toLowerCase();
  const extension = path.extname(normalizedName);

  if (!supportedInstallerExtensions.has(extension)) {
    return false;
  }

  if (!normalizedName.includes(`-${currentVersion}-`)) {
    return false;
  }

  return (
    normalizedName.includes("-mac-") ||
    normalizedName.includes("-win-") ||
    normalizedName.includes("-linux-")
  );
}

function isUpdateMetadataName(fileName) {
  const normalizedName = fileName.toLowerCase();

  return (
    normalizedName === "latest.yml" ||
    normalizedName === "latest-mac.yml" ||
    normalizedName === "latest-linux.yml" ||
    /^latest-linux-(arm|arm64)\.yml$/.test(normalizedName)
  );
}

function isReleaseArtifactName(fileName) {
  if (isInstallerAssetName(fileName)) {
    return true;
  }

  if (fileName.toLowerCase().endsWith(".blockmap")) {
    return isInstallerAssetName(fileName.slice(0, -".blockmap".length));
  }

  return isUpdateMetadataName(fileName);
}

async function collectAssetFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectAssetFiles(entryPath)));
      continue;
    }

    if (!entry.isFile() || !isReleaseArtifactName(entry.name)) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function pickPrimaryFile(files) {
  return [...files].sort((left, right) => left.url.localeCompare(right.url))[0] ?? null;
}

async function mergeUpdateMetadataFiles(sourceFiles, targetPath) {
  const documents = await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      return parse(await readFile(sourceFile, "utf8"));
    })
  );
  const [firstDocument, ...otherDocuments] = documents;

  if (!firstDocument || typeof firstDocument !== "object") {
    throw new Error(`Invalid update metadata in ${sourceFiles[0]}.`);
  }

  const mergedFiles = new Map();

  for (const document of [firstDocument, ...otherDocuments]) {
    const files = Array.isArray(document?.files) ? document.files : [];

    for (const file of files) {
      if (!file || typeof file.url !== "string") {
        continue;
      }

      mergedFiles.set(file.url, file);
    }
  }

  const mergedFileList = [...mergedFiles.values()].sort((left, right) =>
    String(left.url).localeCompare(String(right.url))
  );
  const primaryFile = pickPrimaryFile(mergedFileList);
  const nextDocument = {
    ...firstDocument,
    files: mergedFileList
  };

  if (primaryFile) {
    nextDocument.path = primaryFile.url;
    nextDocument.sha512 =
      typeof primaryFile.sha512 === "string" ? primaryFile.sha512 : nextDocument.sha512;
  }

  await writeFile(targetPath, stringify(nextDocument), "utf8");
}

const sourceDir = path.resolve(process.argv[2] ?? defaultSourceDir);
const targetDir = path.resolve(process.argv[3] ?? defaultTargetDir);
const assetFiles = await collectAssetFiles(sourceDir);

if (!assetFiles.length) {
  throw new Error(`No release assets found in ${sourceDir}.`);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

const filesByName = new Map();

for (const assetFile of assetFiles) {
  const name = path.basename(assetFile);
  const group = filesByName.get(name) ?? [];
  group.push(assetFile);
  filesByName.set(name, group);
}

for (const [fileName, sourceFiles] of filesByName) {
  const targetPath = path.join(targetDir, fileName);

  if (sourceFiles.length === 1) {
    await copyFile(sourceFiles[0], targetPath);
    continue;
  }

  if (isUpdateMetadataName(fileName)) {
    await mergeUpdateMetadataFiles(sourceFiles, targetPath);
    continue;
  }

  throw new Error(
    `Duplicate release asset ${fileName} detected in ${sourceDir}; only update metadata files may be merged.`
  );
}

console.log(
  `Collected ${assetFiles.length} release artifacts into ${targetDir} (${filesByName.size} published files).`
);
