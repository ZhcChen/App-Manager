import type { TransientFeedback } from "@/components/feedback";

export type ProcessItem = {
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

export type TerminateProcessResult = {
  pid: number;
  name: string;
};

export type ProcessApiError = {
  code: string;
  message: string;
};

export type ProcessFeedback = TransientFeedback;
