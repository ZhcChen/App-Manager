import type { TransientFeedback } from "@/components/feedback";

export type ApplicationNodeKind = "application" | "instance" | "process";

export type ApplicationProcessNode = {
  id: string;
  pid: number;
  parentPid: number | null;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  startTimeSeconds: number;
  status: "running" | "protected";
  canTerminate: boolean;
  children: ApplicationProcessNode[];
};

export type ApplicationInstanceItem = {
  id: string;
  pid: number;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  startTimeSeconds: number;
  processCount: number;
  status: "running" | "protected";
  canTerminate: boolean;
  children: ApplicationProcessNode[];
};

export type ApplicationGroupItem = {
  id: string;
  name: string;
  path: string;
  instanceCount: number;
  processCount: number;
  status: "running" | "protected";
  canTerminate: boolean;
  instances: ApplicationInstanceItem[];
};

export type TerminateProcessFailure = {
  code: string;
  message: string;
};

export type TerminateProcessEntryResult = {
  pid: number;
  name: string;
  ok: boolean;
  error: TerminateProcessFailure | null;
};

export type TerminateProcessesResult = {
  totalRequested: number;
  terminatedCount: number;
  failedCount: number;
  results: TerminateProcessEntryResult[];
};

export type ApplicationFeedback = TransientFeedback;
