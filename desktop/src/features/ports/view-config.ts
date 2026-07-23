import type { SortDirection } from "@/features/processes/view-config";
import type { PortBindingItem } from "./types";

export type PortSortKey =
  | "localPort"
  | "protocol"
  | "localAddress"
  | "name"
  | "pid"
  | "userName"
  | "status";

export type PortColumn = {
  key: PortSortKey;
  label: string;
  align?: "start" | "end";
};

export const PORT_VIEW_CONFIG: {
  columns: PortColumn[];
  defaultSort: { key: PortSortKey; direction: SortDirection };
  summary: string;
} = {
  columns: [
    { key: "localPort", label: "端口", align: "end" },
    { key: "protocol", label: "协议" },
    { key: "localAddress", label: "监听地址" },
    { key: "name", label: "进程名称" },
    { key: "pid", label: "PID", align: "end" },
    { key: "userName", label: "用户" },
    { key: "status", label: "状态" }
  ],
  defaultSort: { key: "localPort", direction: "asc" },
  summary: "按监听端口定位占用进程。"
};

export function getPortMetricValue(
  item: PortBindingItem,
  key: PortSortKey
): number | string {
  switch (key) {
    case "localPort":
      return item.localPort;
    case "protocol":
      return item.protocol;
    case "localAddress":
      return item.localAddress;
    case "name":
      return item.name;
    case "pid":
      return item.pid;
    case "userName":
      return item.userName;
    case "status":
      return item.status === "protected" ? "受保护" : "运行中";
  }
}

export function formatPortMetricValue(
  item: PortBindingItem,
  key: PortSortKey
): string {
  switch (key) {
    case "localPort":
      return String(item.localPort);
    case "protocol":
      return item.protocol.toUpperCase();
    case "localAddress":
      return item.localAddress;
    case "name":
      return item.name;
    case "pid":
      return String(item.pid);
    case "userName":
      return item.userName;
    case "status":
      return item.status === "protected" ? "受保护" : "运行中";
  }
}
