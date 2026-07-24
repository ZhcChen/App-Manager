import {
  copyFile,
  readFile,
  mkdir,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
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
const artifactContextPattern = /^desktop-(macos|windows|linux)-(x64|arm64|arm)-assets$/;

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

function getSourceArtifactContext(sourcePath) {
  const resolvedPath = path.resolve(sourcePath);
  const segments = resolvedPath.split(path.sep);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const match = segment.match(artifactContextPattern);

    if (match) {
      const artifactRootSegments = segments
        .slice(0, index + 1)
        .filter((segment, segmentIndex) => !(segmentIndex === 0 && segment === ""));
      const artifactRoot = resolvedPath.startsWith(path.sep)
        ? path.join(path.sep, ...artifactRootSegments)
        : path.join(...artifactRootSegments);

      return {
        platform: match[1],
        arch: match[2],
        artifactRoot
      };
    }
  }

  return null;
}

function getExpectedLinuxDebArch(artifactArch) {
  if (artifactArch === "x64") {
    return "amd64";
  }

  if (artifactArch === "arm64") {
    return "arm64";
  }

  return null;
}

function normalizeReleaseAssetName(fileName, sourcePath) {
  const context = getSourceArtifactContext(sourcePath);

  if (!context || context.platform !== "linux" || path.extname(fileName).toLowerCase() !== ".deb") {
    return fileName;
  }

  const expectedArch = getExpectedLinuxDebArch(context.arch);
  const match = fileName.match(/^(.*-linux-)([^.]+)(\.deb)$/i);

  if (!expectedArch || !match) {
    return fileName;
  }

  return `${match[1]}${expectedArch}${match[3]}`;
}

function pruneNormalizedAliasSources(fileName, sourceFiles) {
  const filesByArtifactRoot = new Map();
  const passthroughFiles = [];

  for (const sourceFile of sourceFiles) {
    const artifactRoot = getSourceArtifactContext(sourceFile)?.artifactRoot;

    if (!artifactRoot) {
      passthroughFiles.push(sourceFile);
      continue;
    }

    const group = filesByArtifactRoot.get(artifactRoot) ?? [];
    group.push(sourceFile);
    filesByArtifactRoot.set(artifactRoot, group);
  }

  const prunedFiles = [...passthroughFiles];

  for (const [artifactRoot, artifactFiles] of filesByArtifactRoot) {
    if (artifactFiles.length === 1) {
      prunedFiles.push(artifactFiles[0]);
      continue;
    }

    const canonicalFiles = artifactFiles.filter(
      (sourceFile) => path.basename(sourceFile) === fileName
    );

    if (canonicalFiles.length === 1) {
      const droppedFiles = artifactFiles.filter((sourceFile) => sourceFile !== canonicalFiles[0]);
      console.warn(
        `Ignored normalized alias release assets for ${fileName} from ${artifactRoot}: ${droppedFiles.join(", ")}.`
      );
      prunedFiles.push(canonicalFiles[0]);
      continue;
    }

    prunedFiles.push(...artifactFiles);
  }

  return prunedFiles;
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

function getPreferredMetadataExtensions(fileName) {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName === "latest-mac.yml") {
    return [".zip", ".dmg"];
  }

  if (
    normalizedName === "latest-linux.yml" ||
    /^latest-linux-(arm|arm64)\.yml$/.test(normalizedName)
  ) {
    return [".appimage", ".deb"];
  }

  if (normalizedName === "latest.yml") {
    return [".exe"];
  }

  return [];
}

function isValidMetadataDocument(document) {
  return Boolean(document) && typeof document === "object" && !Array.isArray(document);
}

function normalizeMetadataFileEntry(file, sourceFile) {
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return file;
  }

  const nextFile = { ...file };

  if (typeof nextFile.url === "string") {
    nextFile.url = normalizeReleaseAssetName(nextFile.url, sourceFile);
  }

  if (typeof nextFile.path === "string") {
    nextFile.path = normalizeReleaseAssetName(nextFile.path, sourceFile);
  }

  return nextFile;
}

function normalizeMetadataPackages(packages, sourceFile) {
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) {
    return packages;
  }

  return Object.fromEntries(
    Object.entries(packages).map(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return [key, value];
      }

      const nextValue = { ...value };

      if (typeof nextValue.path === "string") {
        nextValue.path = normalizeReleaseAssetName(nextValue.path, sourceFile);
      }

      if (typeof nextValue.url === "string") {
        nextValue.url = normalizeReleaseAssetName(nextValue.url, sourceFile);
      }

      return [key, nextValue];
    })
  );
}

function normalizeMetadataDocument(document, sourceFile) {
  if (!isValidMetadataDocument(document)) {
    return document;
  }

  const nextDocument = { ...document };

  if (Array.isArray(document.files)) {
    nextDocument.files = document.files.map((file) =>
      normalizeMetadataFileEntry(file, sourceFile)
    );
  }

  if (typeof document.path === "string") {
    nextDocument.path = normalizeReleaseAssetName(document.path, sourceFile);
  }

  if (document.packages && typeof document.packages === "object" && !Array.isArray(document.packages)) {
    nextDocument.packages = normalizeMetadataPackages(document.packages, sourceFile);
  }

  return nextDocument;
}

function pickPrimaryFileForMetadata(fileName, files, documents) {
  const preferredExtensions = getPreferredMetadataExtensions(fileName);
  const fileByUrl = new Map(files.map((file) => [String(file.url), file]));

  for (const extension of preferredExtensions) {
    for (const document of documents) {
      if (
        typeof document.path === "string" &&
        document.path.toLowerCase().endsWith(extension) &&
        fileByUrl.has(document.path)
      ) {
        return fileByUrl.get(document.path) ?? null;
      }
    }
  }

  for (const document of documents) {
    if (typeof document.path === "string" && fileByUrl.has(document.path)) {
      return fileByUrl.get(document.path) ?? null;
    }
  }

  for (const extension of preferredExtensions) {
    const matchingFile = files.find((file) => String(file.url).toLowerCase().endsWith(extension));
    if (matchingFile) {
      return matchingFile;
    }
  }

  return pickPrimaryFile(files);
}

function mergePackagesMap(documents) {
  const mergedPackages = {};

  for (const document of documents) {
    if (!document?.packages || typeof document.packages !== "object") {
      continue;
    }

    Object.assign(mergedPackages, document.packages);
  }

  return Object.keys(mergedPackages).length > 0 ? mergedPackages : undefined;
}

async function mergeUpdateMetadataFiles(fileName, sourceFiles, targetPath) {
  const rawDocuments = await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      try {
        const document = normalizeMetadataDocument(
          parse(await readFile(sourceFile, "utf8")),
          sourceFile
        );

        return {
          sourceFile,
          document,
          parseError: null
        };
      } catch (error) {
        return {
          sourceFile,
          document: null,
          parseError:
            error instanceof Error ? error.message : "Unknown metadata parse failure."
        };
      }
    })
  );
  const validDocuments = rawDocuments.filter(({ document }) => isValidMetadataDocument(document));
  const invalidDocuments = rawDocuments.filter(({ document }) => !isValidMetadataDocument(document));

  if (invalidDocuments.length > 0) {
    const invalidSummary = invalidDocuments
      .map(({ sourceFile, parseError }) =>
        parseError ? `${sourceFile} (${parseError})` : sourceFile
      )
      .join(", ");

    console.warn(`Skipped invalid update metadata for ${fileName}: ${invalidSummary}`);
  }

  const [firstDocumentEntry, ...otherDocumentEntries] = validDocuments;

  if (!firstDocumentEntry) {
    throw new Error(
      `Invalid update metadata for ${fileName}. Sources: ${sourceFiles.join(", ")}.`
    );
  }

  const firstDocument = firstDocumentEntry.document;
  const otherDocuments = otherDocumentEntries.map(({ document }) => document);

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
  const primaryFile = pickPrimaryFileForMetadata(
    fileName,
    mergedFileList,
    validDocuments.map(({ document }) => document)
  );
  const nextDocument = {
    ...firstDocument,
    files: mergedFileList
  };
  const mergedPackages = mergePackagesMap(validDocuments.map(({ document }) => document));

  if (mergedPackages) {
    nextDocument.packages = mergedPackages;
  }

  if (primaryFile) {
    nextDocument.path = primaryFile.url;
    nextDocument.sha512 =
      typeof primaryFile.sha512 === "string" ? primaryFile.sha512 : nextDocument.sha512;
  }

  await writeFile(targetPath, stringify(nextDocument), "utf8");
}

async function hashFile(filePath) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function areFilesIdentical(filePaths) {
  const hashes = await Promise.all(filePaths.map((filePath) => hashFile(filePath)));
  return new Set(hashes).size <= 1;
}

async function main() {
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
    const name = normalizeReleaseAssetName(path.basename(assetFile), assetFile);
    const group = filesByName.get(name) ?? [];
    group.push(assetFile);
    filesByName.set(name, group);
  }

  for (const [fileName, sourceFiles] of filesByName) {
    const normalizedSourceFiles = pruneNormalizedAliasSources(fileName, sourceFiles);
    const targetPath = path.join(targetDir, fileName);

    if (isUpdateMetadataName(fileName)) {
      await mergeUpdateMetadataFiles(fileName, normalizedSourceFiles, targetPath);
      continue;
    }

    if (normalizedSourceFiles.length === 1) {
      await copyFile(normalizedSourceFiles[0], targetPath);
      continue;
    }

    if (await areFilesIdentical(normalizedSourceFiles)) {
      console.warn(
        `Deduplicated identical release asset ${fileName} from ${normalizedSourceFiles.join(", ")}.`
      );
      await copyFile(normalizedSourceFiles[0], targetPath);
      continue;
    }

    throw new Error(
      `Duplicate release asset ${fileName} detected. Sources: ${normalizedSourceFiles.join(", ")}.`
    );
  }

  console.log(
    `Collected ${assetFiles.length} release artifacts into ${targetDir} (${filesByName.size} published files).`
  );
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`::error title=collect-release-assets::${message}`);
  throw error;
}
