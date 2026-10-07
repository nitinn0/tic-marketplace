export type TreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type TreeIndex<T extends TreeNode> = {
  byId: Map<string, T>;
  /** Children per parent id (`null` for roots), ordered by sortOrder then name. */
  childrenOf: Map<string | null, T[]>;
};

export type DepthFirstEntry<T> = { node: T; depth: number };

const compareNodes = (a: TreeNode, b: TreeNode) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/**
 * Taxonomies are small reference tables, so hierarchy operations load the whole table once and
 * work in memory. Every walk tracks visited ids so corrupted data cannot loop forever.
 */
export function buildTreeIndex<T extends TreeNode>(nodes: T[]): TreeIndex<T> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = new Map<string | null, T[]>();
  for (const node of nodes) {
    const parentKey = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    const siblings = childrenOf.get(parentKey) ?? [];
    siblings.push(node);
    childrenOf.set(parentKey, siblings);
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort(compareNodes);
  }
  return { byId, childrenOf };
}

/** Ancestors from the root down to the direct parent (the node itself is excluded). */
export function ancestorsOf<T extends TreeNode>(index: TreeIndex<T>, id: string): T[] {
  const ancestors: T[] = [];
  const visited = new Set<string>([id]);
  let parentId = index.byId.get(id)?.parentId ?? null;
  while (parentId && !visited.has(parentId)) {
    const parent = index.byId.get(parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    visited.add(parentId);
    parentId = parent.parentId;
  }
  return ancestors;
}

export function descendantIdsOf<T extends TreeNode>(index: TreeIndex<T>, id: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>([id]);
  const stack = [...(index.childrenOf.get(id) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    result.push(node.id);
    stack.push(...(index.childrenOf.get(node.id) ?? []));
  }
  return result;
}

/** A node is effectively active only when it and every ancestor are active. */
export function isEffectivelyActive<T extends TreeNode>(index: TreeIndex<T>, id: string) {
  const node = index.byId.get(id);
  return Boolean(node?.active) && ancestorsOf(index, id).every((ancestor) => ancestor.active);
}

/** Moving `id` under `newParentId` would make it its own ancestor. */
export function wouldCreateCycle<T extends TreeNode>(index: TreeIndex<T>, id: string, newParentId: string | null) {
  if (!newParentId) return false;
  return newParentId === id || descendantIdsOf(index, id).includes(newParentId);
}

export function orderDepthFirst<T extends TreeNode>(index: TreeIndex<T>): DepthFirstEntry<T>[] {
  const result: DepthFirstEntry<T>[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const node of index.childrenOf.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export type Nested<T> = T & { children: Nested<T>[] };

/**
 * Builds a nested tree from depth-first entries. When `include` is given, a node is kept if it
 * matches or has a matching descendant, so search results keep their ancestry visible.
 */
export function nestTree<T extends TreeNode, R>(
  index: TreeIndex<T>,
  map: (node: T, depth: number) => R,
  include?: (node: T) => boolean,
): Nested<R>[] {
  const build = (parentId: string | null, depth: number, visited: Set<string>): Nested<R>[] => {
    const nodes: Nested<R>[] = [];
    for (const node of index.childrenOf.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      const nextVisited = new Set(visited).add(node.id);
      const children = build(node.id, depth + 1, nextVisited);
      if (!include || include(node) || children.length > 0) {
        nodes.push({ ...map(node, depth), children });
      }
    }
    return nodes;
  };
  return build(null, 0, new Set());
}
