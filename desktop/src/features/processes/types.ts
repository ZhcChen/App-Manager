export type ProcessItem = {
  pid: number;
  name: string;
  path: string;
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
