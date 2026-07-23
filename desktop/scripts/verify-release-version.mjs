import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(desktopRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const rawTag = process.env.RELEASE_TAG ?? process.argv[2];

if (!rawTag) {
  throw new Error("Missing release tag. Provide RELEASE_TAG or the tag name as argv[2].");
}

const normalizedTag = rawTag.startsWith("refs/tags/")
  ? rawTag.slice("refs/tags/".length)
  : rawTag;
const normalizedVersion = normalizedTag.startsWith("v")
  ? normalizedTag.slice(1)
  : normalizedTag;

if (packageJson.version !== normalizedVersion) {
  throw new Error(
    `Release tag ${normalizedTag} does not match desktop/package.json version ${packageJson.version}.`
  );
}

console.log(`Verified release tag ${normalizedTag} matches desktop version ${packageJson.version}.`);
