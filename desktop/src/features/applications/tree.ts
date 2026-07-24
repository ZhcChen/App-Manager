import type {
  ApplicationGroupItem,
  ApplicationInstanceItem,
  ApplicationNodeKind,
  ApplicationProcessNode
} from "./types";

export type ApplicationViewNode = {
  id: string;
  kind: ApplicationNodeKind;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  pid: number | null;
  instanceCount: number;
  processCount: number;
  status: "running" | "protected";
  canTerminate: boolean;
  children: ApplicationViewNode[];
};

export type ApplicationContextMenuTarget = {
  kind: ApplicationNodeKind;
  id: string;
  name: string;
  canTerminate: boolean;
  pids: number[];
};

export function buildApplicationViewTree(
  groups: ApplicationGroupItem[]
): ApplicationViewNode[] {
  return groups.map((group) => ({
    id: group.id,
    kind: "application",
    name: group.name,
    path: group.path,
    userName: "",
    kindLabel: "应用",
    pid: null,
    instanceCount: group.instanceCount,
    processCount: group.processCount,
    status: group.status,
    canTerminate: group.canTerminate,
    children: group.instances.map(buildInstanceNode)
  }));
}

export function filterApplicationViewTree(
  items: ApplicationViewNode[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return {
      items,
      expandedIds: new Set<string>()
    };
  }

  const expandedIds = new Set<string>();
  const filteredItems = items
    .map((item) => filterNode(item, normalized, expandedIds))
    .filter((item): item is ApplicationViewNode => item !== null);

  return {
    items: filteredItems,
    expandedIds
  };
}

export function buildApplicationContextMenuTarget(
  node: ApplicationViewNode
): ApplicationContextMenuTarget {
  return {
    kind: node.kind,
    id: node.id,
    name: node.name,
    canTerminate: node.canTerminate,
    pids: collectTargetPids(node)
  };
}

export function buildApplicationProcessIndex(groups: ApplicationGroupItem[]) {
  const index = new Map<number, { name: string; canTerminate: boolean }>();

  for (const group of groups) {
    for (const instance of group.instances) {
      index.set(instance.pid, {
        name: instance.name,
        canTerminate: instance.canTerminate
      });
      indexProcessNode(index, instance.children);
    }
  }

  return index;
}

export function removeApplicationPids(
  groups: ApplicationGroupItem[],
  pids: number[]
) {
  const pidSet = new Set(pids);

  return groups
    .map((group) => removePidsFromGroup(group, pidSet))
    .filter((group): group is ApplicationGroupItem => group !== null);
}

function buildInstanceNode(instance: ApplicationInstanceItem): ApplicationViewNode {
  return {
    id: instance.id,
    kind: "instance",
    name: instance.name,
    path: instance.path,
    userName: instance.userName,
    kindLabel: instance.kindLabel,
    pid: instance.pid,
    instanceCount: 1,
    processCount: instance.processCount,
    status: instance.status,
    canTerminate: instance.canTerminate,
    children: instance.children.map(buildProcessNode)
  };
}

function buildProcessNode(process: ApplicationProcessNode): ApplicationViewNode {
  return {
    id: process.id,
    kind: "process",
    name: process.name,
    path: process.path,
    userName: process.userName,
    kindLabel: process.kindLabel,
    pid: process.pid,
    instanceCount: 0,
    processCount: countProcessNode(process),
    status: process.status,
    canTerminate: process.canTerminate,
    children: process.children.map(buildProcessNode)
  };
}

function filterNode(
  node: ApplicationViewNode,
  normalizedQuery: string,
  expandedIds: Set<string>
): ApplicationViewNode | null {
  const isMatch = nodeMatchesQuery(node, normalizedQuery);

  if (isMatch) {
    addExpandableIds(node, expandedIds);
    return node;
  }

  const children = node.children
    .map((child) => filterNode(child, normalizedQuery, expandedIds))
    .filter((child): child is ApplicationViewNode => child !== null);

  if (!children.length) {
    return null;
  }

  expandedIds.add(node.id);
  return {
    ...node,
    children
  };
}

function nodeMatchesQuery(node: ApplicationViewNode, normalizedQuery: string) {
  return (
    node.name.toLowerCase().includes(normalizedQuery) ||
    node.path.toLowerCase().includes(normalizedQuery) ||
    node.userName.toLowerCase().includes(normalizedQuery) ||
    node.kindLabel.toLowerCase().includes(normalizedQuery) ||
    (node.pid !== null && String(node.pid).includes(normalizedQuery))
  );
}

function addExpandableIds(node: ApplicationViewNode, expandedIds: Set<string>) {
  if (node.kind !== "process" && node.children.length > 0) {
    expandedIds.add(node.id);
  }

  for (const child of node.children) {
    addExpandableIds(child, expandedIds);
  }
}

function collectTargetPids(node: ApplicationViewNode) {
  if (node.kind === "process" && node.pid !== null) {
    return [node.pid];
  }

  const ordered = collectTreePids(node, false);
  return dedupePids(ordered);
}

function collectTreePids(node: ApplicationViewNode, includeProcessSelf: boolean): number[] {
  const pids = node.children.flatMap((child) => collectTreePids(child, true));

  if (node.kind === "instance" && node.pid !== null) {
    pids.push(node.pid);
  }

  if (includeProcessSelf && node.kind === "process" && node.pid !== null) {
    pids.push(node.pid);
  }

  return pids;
}

function dedupePids(pids: number[]) {
  const seen = new Set<number>();
  const next: number[] = [];

  for (const pid of pids) {
    if (!seen.has(pid)) {
      seen.add(pid);
      next.push(pid);
    }
  }

  return next;
}

function indexProcessNode(
  index: Map<number, { name: string; canTerminate: boolean }>,
  nodes: ApplicationProcessNode[]
) {
  for (const node of nodes) {
    index.set(node.pid, {
      name: node.name,
      canTerminate: node.canTerminate
    });
    indexProcessNode(index, node.children);
  }
}

function removePidsFromGroup(
  group: ApplicationGroupItem,
  pidSet: Set<number>
): ApplicationGroupItem | null {
  const instances = group.instances
    .map((instance) => removePidsFromInstance(instance, pidSet))
    .filter((instance): instance is ApplicationInstanceItem => instance !== null);

  if (!instances.length) {
    return null;
  }

  const hasProtected = instances.some((instance) => instance.status === "protected");

  return {
    ...group,
    instanceCount: instances.length,
    processCount: instances.reduce((total, instance) => total + instance.processCount, 0),
    status: hasProtected ? "protected" : "running",
    canTerminate: !hasProtected,
    instances
  };
}

function removePidsFromInstance(
  instance: ApplicationInstanceItem,
  pidSet: Set<number>
): ApplicationInstanceItem | null {
  if (pidSet.has(instance.pid)) {
    return null;
  }

  const children = instance.children
    .map((node) => removePidsFromProcessNode(node, pidSet))
    .filter((node): node is ApplicationProcessNode => node !== null);

  const hasProtected =
    instance.status === "protected" || children.some((node) => subtreeHasProtected(node));

  return {
    ...instance,
    processCount: 1 + children.reduce((total, node) => total + countProcessNode(node), 0),
    status: hasProtected ? "protected" : "running",
    canTerminate: !hasProtected,
    children
  };
}

function removePidsFromProcessNode(
  node: ApplicationProcessNode,
  pidSet: Set<number>
): ApplicationProcessNode | null {
  if (pidSet.has(node.pid)) {
    return null;
  }

  return {
    ...node,
    children: node.children
      .map((child) => removePidsFromProcessNode(child, pidSet))
      .filter((child): child is ApplicationProcessNode => child !== null)
  };
}

function countProcessNode(node: ApplicationProcessNode): number {
  return 1 + node.children.reduce((total, child) => total + countProcessNode(child), 0);
}

function subtreeHasProtected(node: ApplicationProcessNode): boolean {
  if (node.status === "protected" || !node.canTerminate) {
    return true;
  }

  return node.children.some((child) => subtreeHasProtected(child));
}
