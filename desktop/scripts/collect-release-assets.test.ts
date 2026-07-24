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

  it("skips metadata documents that fail YAML parsing when a valid duplicate exists", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(sourceDir, "mac-a/latest-mac.yml", "version: [unterminated");
    await writeFixtureFile(
      sourceDir,
      "mac-b/latest-mac.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-mac-arm64.zip
    sha512: arm64zip
path: App-Manager-${version}-mac-arm64.zip
sha512: arm64zip
`
    );

    runCollector(sourceDir, targetDir);

    const output = parse(await readFile(path.join(targetDir, "latest-mac.yml"), "utf8"));
    expect(output.path).toBe(`App-Manager-${version}-mac-arm64.zip`);
    expect(output.sha512).toBe("arm64zip");
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

  it("normalizes Linux deb asset names using the artifact directory architecture", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");
    const debName = `App-Manager-${version}-linux-amd64.deb`;

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/${debName}`,
      "linux-x64-binary"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/${debName}`,
      "linux-arm64-binary"
    );

    runCollector(sourceDir, targetDir);

    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-amd64.deb`), "utf8")
    ).toBe("linux-x64-binary");
    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-arm64.deb`), "utf8")
    ).toBe("linux-arm64-binary");
  });

  it("rewrites Linux arm64 metadata that references a misnamed amd64 deb asset", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/App-Manager-${version}-linux-amd64.deb`,
      "linux-arm64-binary"
    );
    await writeFixtureFile(
      sourceDir,
      "desktop-linux-arm64-assets/latest-linux-arm64.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-linux-amd64.deb
    sha512: arm64deb
path: App-Manager-${version}-linux-amd64.deb
sha512: arm64deb
`
    );

    runCollector(sourceDir, targetDir);

    const output = parse(await readFile(path.join(targetDir, "latest-linux-arm64.yml"), "utf8"));
    expect(output.path).toBe(`App-Manager-${version}-linux-arm64.deb`);
    expect(output.sha512).toBe("arm64deb");
    expect(output.files).toEqual([
      {
        url: `App-Manager-${version}-linux-arm64.deb`,
        sha512: "arm64deb"
      }
    ]);
  });

  it("prefers the canonical Linux deb file when a normalized alias collides in the same artifact", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/App-Manager-${version}-linux-amd64.deb`,
      "normalized-alias-binary"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/App-Manager-${version}-linux-arm64.deb`,
      "canonical-binary"
    );

    runCollector(sourceDir, targetDir);

    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-arm64.deb`), "utf8")
    ).toBe("canonical-binary");
  });

  it("normalizes Linux AppImage assets and blockmaps using the artifact directory architecture", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");
    const appImageName = `App-Manager-${version}-linux-arm64.AppImage`;
    const blockmapName = `${appImageName}.blockmap`;

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/${appImageName}`,
      "linux-x64-appimage"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/${blockmapName}`,
      "linux-x64-blockmap"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/${appImageName}`,
      "linux-arm64-appimage"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-arm64-assets/${blockmapName}`,
      "linux-arm64-blockmap"
    );

    runCollector(sourceDir, targetDir);

    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-x64.AppImage`), "utf8")
    ).toBe("linux-x64-appimage");
    expect(
      await readFile(
        path.join(targetDir, `App-Manager-${version}-linux-x64.AppImage.blockmap`),
        "utf8"
      )
    ).toBe("linux-x64-blockmap");
    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-arm64.AppImage`), "utf8")
    ).toBe("linux-arm64-appimage");
    expect(
      await readFile(
        path.join(targetDir, `App-Manager-${version}-linux-arm64.AppImage.blockmap`),
        "utf8"
      )
    ).toBe("linux-arm64-blockmap");
  });

  it("rewrites Linux x64 metadata that references a misnamed arm64 AppImage asset", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/App-Manager-${version}-linux-arm64.AppImage`,
      "linux-x64-appimage"
    );
    await writeFixtureFile(
      sourceDir,
      "desktop-linux-x64-assets/latest-linux.yml",
      `version: ${version}
files:
  - url: App-Manager-${version}-linux-arm64.AppImage
    sha512: x64appimage
path: App-Manager-${version}-linux-arm64.AppImage
sha512: x64appimage
`
    );

    runCollector(sourceDir, targetDir);

    const output = parse(await readFile(path.join(targetDir, "latest-linux.yml"), "utf8"));
    expect(output.path).toBe(`App-Manager-${version}-linux-x64.AppImage`);
    expect(output.sha512).toBe("x64appimage");
    expect(output.files).toEqual([
      {
        url: `App-Manager-${version}-linux-x64.AppImage`,
        sha512: "x64appimage"
      }
    ]);
  });

  it("prefers the x86_64 AppImage alias over a wrong arm64 alias inside the x64 artifact", async () => {
    const sourceDir = await createTempDir();
    const targetDir = path.join(sourceDir, "out");

    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/App-Manager-${version}-linux-arm64.AppImage`,
      "wrong-arm64-appimage"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/App-Manager-${version}-linux-x86_64.AppImage`,
      "preferred-x86_64-appimage"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/App-Manager-${version}-linux-arm64.AppImage.blockmap`,
      "wrong-arm64-blockmap"
    );
    await writeFixtureFile(
      sourceDir,
      `desktop-linux-x64-assets/App-Manager-${version}-linux-x86_64.AppImage.blockmap`,
      "preferred-x86_64-blockmap"
    );

    runCollector(sourceDir, targetDir);

    expect(
      await readFile(path.join(targetDir, `App-Manager-${version}-linux-x64.AppImage`), "utf8")
    ).toBe("preferred-x86_64-appimage");
    expect(
      await readFile(
        path.join(targetDir, `App-Manager-${version}-linux-x64.AppImage.blockmap`),
        "utf8"
      )
    ).toBe("preferred-x86_64-blockmap");
  });
});
