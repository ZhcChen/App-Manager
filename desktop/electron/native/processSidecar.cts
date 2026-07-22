import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { app } from "electron";
import {
  commandError,
  type DesktopCommandError,
  type DesktopCommandResult
} from "../ipc/result.cjs";

const execFileAsync = promisify(execFile);
const SIDE_CAR_TIMEOUT_MS = 15_000;

type ExecFileFailure = Error & {
  code?: string | number;
  stdout?: string;
  stderr?: string;
};

type ProcessItem = {
  pid: number;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  cpuUsagePercent: number;
  memoryBytes: number;
  virtualMemoryBytes: number;
  runTimeSeconds: number;
  startTimeSeconds: number;
  diskReadBytes: number;
  diskWrittenBytes: number;
  status: "running" | "protected";
  canTerminate: boolean;
};

type TerminateProcessResult = {
  pid: number;
  name: string;
};

function resolveSidecarBinaryName() {
  return process.platform === "win32" ? "process-sidecar.exe" : "process-sidecar";
}

export function resolveSidecarPath() {
  const binaryName = resolveSidecarBinaryName();
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", binaryName);
  }

  return path.resolve(__dirname, "../../../target/debug", binaryName);
}

function normalizeSidecarFailure(error: unknown): DesktopCommandError {
  const failure = error as ExecFileFailure;
  if (failure?.code === "ENOENT") {
    return {
      code: "system_unavailable",
      message:
        "缺少 process-sidecar 可执行文件，请先运行 pnpm --dir desktop build:sidecar:dev。"
    };
  }

  if (failure?.code === "ETIMEDOUT") {
    return {
      code: "operation_failed",
      message: "process-sidecar 响应超时。"
    };
  }

  return {
    code: "operation_failed",
    message: failure?.message ?? "process-sidecar 执行失败。"
  };
}

function parseSidecarOutput<T>(rawOutput: string): DesktopCommandResult<T> {
  const output = rawOutput.trim();
  if (!output) {
    return commandError({
      code: "operation_failed",
      message: "process-sidecar 没有返回任何结果。"
    });
  }

  try {
    return JSON.parse(output) as DesktopCommandResult<T>;
  } catch {
    return commandError({
      code: "operation_failed",
      message: "process-sidecar 返回了无法解析的 JSON 结果。"
    });
  }
}

async function invokeSidecar<T>(
  args: string[]
): Promise<DesktopCommandResult<T>> {
  const sidecarPath = resolveSidecarPath();

  try {
    const { stdout } = await execFileAsync(sidecarPath, args, {
      timeout: SIDE_CAR_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    return parseSidecarOutput<T>(stdout);
  } catch (error) {
    const failure = error as ExecFileFailure;
    if (typeof failure?.stdout === "string" && failure.stdout.trim()) {
      return parseSidecarOutput<T>(failure.stdout);
    }

    return commandError(normalizeSidecarFailure(error));
  }
}

export async function listProcessesFromSidecar() {
  return invokeSidecar<ProcessItem[]>(["list"]);
}

export async function terminateProcessViaSidecar(pid: number) {
  return invokeSidecar<TerminateProcessResult>(["terminate", String(pid)]);
}
