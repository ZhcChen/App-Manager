import type { ProcessItem } from "./types";
import { formatBytes, formatDuration, formatPercent } from "./formatters";

export type ProcessViewId = "cpu" | "memory" | "energy" | "disk" | "network";
export type SortDirection = "asc" | "desc";
export type ProcessSortKey =
  | "name"
  | "cpuUsagePercent"
  | "runTimeSeconds"
  | "memoryBytes"
  | "virtualMemoryBytes"
  | "pid"
  | "userName"
  | "kindLabel"
  | "status"
  | "diskReadBytes"
  | "diskWrittenBytes"
  | "energyImpact"
  | "networkDownBytes"
  | "networkUpBytes";

export type ProcessColumn = {
  key: ProcessSortKey;
  label: string;
  align?: "start" | "end";
};

export const PROCESS_VIEW_ORDER: ProcessViewId[] = [
  "cpu",
  "memory",
  "energy",
  "disk",
  "network"
];

export const PROCESS_VIEW_LABELS: Record<ProcessViewId, string> = {
  cpu: "CPU",
  memory: "内存",
  energy: "能耗",
  disk: "磁盘",
  network: "网络"
};

export const PROCESS_VIEW_CONFIG: Record<
  ProcessViewId,
  {
    columns: ProcessColumn[];
    defaultSort: { key: ProcessSortKey; direction: SortDirection };
    summary: string;
  }
> = {
  cpu: {
    columns: [
      { key: "name", label: "进程名称" },
      { key: "cpuUsagePercent", label: "% CPU", align: "end" },
      { key: "runTimeSeconds", label: "CPU 时间", align: "end" },
      { key: "memoryBytes", label: "内存", align: "end" },
      { key: "pid", label: "PID", align: "end" },
      { key: "userName", label: "用户" }
    ],
    defaultSort: { key: "cpuUsagePercent", direction: "desc" },
    summary: "按 CPU 占用观察和结束异常进程。"
  },
  memory: {
    columns: [
      { key: "name", label: "进程名称" },
      { key: "memoryBytes", label: "内存", align: "end" },
      { key: "virtualMemoryBytes", label: "虚拟内存", align: "end" },
      { key: "cpuUsagePercent", label: "% CPU", align: "end" },
      { key: "pid", label: "PID", align: "end" },
      { key: "userName", label: "用户" }
    ],
    defaultSort: { key: "memoryBytes", direction: "desc" },
    summary: "优先查看常驻内存，虚拟内存作为辅助字段。"
  },
  energy: {
    columns: [
      { key: "name", label: "进程名称" },
      { key: "energyImpact", label: "能耗影响", align: "end" },
      { key: "kindLabel", label: "种类" },
      { key: "runTimeSeconds", label: "运行时间", align: "end" },
      { key: "pid", label: "PID", align: "end" },
      { key: "status", label: "状态" }
    ],
    defaultSort: { key: "energyImpact", direction: "desc" },
    summary: "基于 CPU 与内存的轻量能耗近似视图。"
  },
  disk: {
    columns: [
      { key: "name", label: "进程名称" },
      { key: "diskReadBytes", label: "读取总量", align: "end" },
      { key: "diskWrittenBytes", label: "写入总量", align: "end" },
      { key: "runTimeSeconds", label: "运行时间", align: "end" },
      { key: "pid", label: "PID", align: "end" },
      { key: "userName", label: "用户" }
    ],
    defaultSort: { key: "diskWrittenBytes", direction: "desc" },
    summary: "当前展示累计磁盘读写量。"
  },
  network: {
    columns: [
      { key: "name", label: "进程名称" },
      { key: "networkDownBytes", label: "接收", align: "end" },
      { key: "networkUpBytes", label: "发送", align: "end" },
      { key: "cpuUsagePercent", label: "% CPU", align: "end" },
      { key: "pid", label: "PID", align: "end" },
      { key: "userName", label: "用户" }
    ],
    defaultSort: { key: "name", direction: "asc" },
    summary: "网络列结构已就位，真实进程级流量后续补齐。"
  }
};

export function getEnergyImpact(item: ProcessItem): number {
  return Number(
    (
      item.cpuUsagePercent * 1.35 +
      item.memoryBytes / (1024 * 1024 * 512)
    ).toFixed(1)
  );
}

export function getMetricValue(
  item: ProcessItem,
  key: ProcessSortKey
): number | string | null {
  switch (key) {
    case "name":
      return item.name;
    case "cpuUsagePercent":
      return item.cpuUsagePercent;
    case "runTimeSeconds":
      return item.runTimeSeconds;
    case "memoryBytes":
      return item.memoryBytes;
    case "virtualMemoryBytes":
      return item.virtualMemoryBytes;
    case "pid":
      return item.pid;
    case "userName":
      return item.userName;
    case "kindLabel":
      return item.kindLabel;
    case "status":
      return item.status === "protected" ? "受保护" : "运行中";
    case "diskReadBytes":
      return item.diskReadBytes;
    case "diskWrittenBytes":
      return item.diskWrittenBytes;
    case "energyImpact":
      return getEnergyImpact(item);
    case "networkDownBytes":
    case "networkUpBytes":
      return null;
  }
}

export function formatMetricValue(
  item: ProcessItem,
  key: ProcessSortKey
): string {
  switch (key) {
    case "name":
      return item.name;
    case "cpuUsagePercent":
      return formatPercent(item.cpuUsagePercent);
    case "runTimeSeconds":
      return formatDuration(item.runTimeSeconds);
    case "memoryBytes":
      return formatBytes(item.memoryBytes);
    case "virtualMemoryBytes":
      return formatBytes(item.virtualMemoryBytes);
    case "pid":
      return String(item.pid);
    case "userName":
      return item.userName;
    case "kindLabel":
      return item.kindLabel;
    case "status":
      return item.status === "protected" ? "受保护" : "运行中";
    case "diskReadBytes":
      return formatBytes(item.diskReadBytes);
    case "diskWrittenBytes":
      return formatBytes(item.diskWrittenBytes);
    case "energyImpact":
      return getEnergyImpact(item).toFixed(1);
    case "networkDownBytes":
    case "networkUpBytes":
      return "—";
  }
}
