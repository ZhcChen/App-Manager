import { chmod, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopRoot, "..");
const binaryName = process.platform === "win32" ? "process-sidecar.exe" : "process-sidecar";
const sourcePath = path.join(repoRoot, "target", "release", binaryName);
const targetDir = path.join(desktopRoot, "resources", "bin");
const targetPath = path.join(targetDir, binaryName);

await mkdir(targetDir, { recursive: true });
await copyFile(sourcePath, targetPath);

if (process.platform !== "win32") {
  await chmod(targetPath, 0o755);
}

console.log(`Prepared sidecar: ${targetPath}`);
