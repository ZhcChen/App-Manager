export type PortBindingItem = {
  id: string;
  pid: number;
  name: string;
  path: string;
  userName: string;
  localAddress: string;
  localPort: number;
  protocol: "tcp" | "udp";
  status: "running" | "protected";
  canTerminate: boolean;
};
