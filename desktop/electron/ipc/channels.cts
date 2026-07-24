export const DESKTOP_CHANNELS = {
  bootstrapState: "desktop:bootstrap-state",
  listApplications: "applications:list",
  listProcesses: "processes:list",
  listPorts: "ports:list",
  terminateProcess: "processes:terminate",
  terminateProcesses: "processes:terminate-many",
  showProcessContextMenu: "processes:show-context-menu",
  showApplicationContextMenu: "applications:show-context-menu",
  processContextAction: "processes:context-action",
  checkForUpdates: "updates:check",
  openUpdateDownload: "updates:open-download"
} as const;
