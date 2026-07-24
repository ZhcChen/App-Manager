import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopRoot, "..");
const scriptPath = path.join(scriptDir, "collect-release-assets.mjs");
const packageJson = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
const version = String(packageJson.version);
const tempDirs: string[] = [];

async function createTempDir() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "collect-release-assets-"));
  tempDirs.push(tempDir);
  return tempDir;
}

async function writeFixtureFile(rootDir, relativePath, contents) {
  const targetPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents, "utf8");
  return targetPath;
}

function runCollector(sourceDir, targetDir) {
  execFileSync(process.execPath, [scriptPath, sourceDir, targetDir], {
    cwd: repoRoot,
    stdio: "pipe"
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((tempDir) =>
      rm(tempDir, { recursive: true, force: true })
    )
  );
});

describe("collect-release-assets", () => {
  it("merges macOS metadata and keeps a zip as the primary updater path", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(
      sourceDir,
      "mac-arm64/latest-mac.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-mac-arm64.zip
    sha512: arm64zip
  - url: App-Manager-${version}-mac-arm64.dmg
    sha512: arm64dmg
path: App-Manager-${version}-mac-arm64.zip
sha512: arm64zip
`
    );
    await writeFixtureFile(
      sourceDir,
      "mac-x64/latest-mac.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-mac-x64.zip
    sha512: x64zip
  - url: App-Manager-${version}-mac-x64.dmg
    sha512: x64dmg
path: App-Manager-${version}-mac-x64.zip
sha512: x64zip
`
    );

    runCollector(sourceDir, targetDir);

    const output = parse(await readFile(path.join(targetDir, "latest-mac.yml"), "utf8"));
    expect(output.path).toBe(`App-Manager-${version}-mac-arm64.zip`);
    expect(output.sha512).toBe("arm64zip");
    expect(output.files).toHaveLength(4);
  });

  it("skips invalid update metadata when at least one valid document exists", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(sourceDir, "win-a/latest.yml", "");
    await writeFixtureFile(
      sourceDir,
      "win-b/latest.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-win-x64.exe
    sha512: winx64
path: App-Manager-${version}-win-x64.exe
sha512: winx64
`
    );

    runCollector(sourceDir, targetDir);

    const output = parse(await readFile(path.join(targetDir, "latest.yml"), "utf8"));
    expect(output.path).toBe(`App-Manager-${version}-win-x64.exe`);
    expect(output.files).toEqual([
      {
        url: `App-Manager-${version}-win-x64.exe`,
        sha512: "winx64"
      }
    ]);
  });

  it("deduplicates identical non-metadata assets copied from multiple artifacts", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");
    const fileName = `App-Manager-${version}-win-x64.exe`;

    await writeFixtureFile(sourceDir, `win-a/${fileName}`, "same-binary");
    await writeFixtureFile(sourceDir, `win-b/${fileName}`, "same-binary");

    runCollector(sourceDir, targetDir);

    expect(await readFile(path.join(targetDir, fileName), "utf8")).toBe("same-binary");
  });
});
