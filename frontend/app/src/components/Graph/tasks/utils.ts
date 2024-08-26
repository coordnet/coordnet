import { Edge } from "reactflow";
import * as Y from "yjs";

import { GraphNode, NodeType } from "@/types";

import { Graph } from "./types";

export const setNodesState = (
  nodeIds: string[],
  nodesMap: Y.Map<GraphNode> | undefined,
  state: "active" | "executing" | "inactive" = "active",
) => {
  nodeIds.forEach((id) => {
    const node = nodesMap?.get(id);
    if (node) {
      nodesMap?.set(id, { ...node, data: { ...node.data, state } });
    }
  });
};

export const isResponseNode = (node: GraphNode) => {
  return (
    node?.data?.type === NodeType.ResponseMultiple ||
    node?.data?.type === NodeType.ResponseSingle ||
    node?.data?.type === NodeType.ResponseCombined
  );
};

export const isSingleResponseType = (node: GraphNode | null) => {
  return (
    node?.data?.type === NodeType.ResponseSingle || node?.data?.type === NodeType.ResponseCombined
  );
};

export const isMultipleResponseNode = (node: GraphNode | null) => {
  return (
    node?.data?.type === NodeType.ResponseSingle || node?.data?.type === NodeType.ResponseMultiple
  );
};

export const topologicalSort = (adjacencyList: Record<string, string[]>): string[] => {
  const visited: Set<string> = new Set();
  const stack: string[] = [];

  const dfs = (node: string): void => {
    if (visited.has(node)) return;
    visited.add(node);
    const neighbors = adjacencyList[node] || [];
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    });
    stack.push(node);
  };

  Object.keys(adjacencyList).forEach((node) => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });

  return stack;
};

export const createGraph = (nodes: GraphNode[], edges: Edge[]): Graph => {
  // Create adjacency list from edges
  // const nodeIds = nodes.map((nodes) => nodes.id);
  const adjacencyList: { [id: string]: string[] } = {};
  const nodeIds = nodes.map((nodes) => nodes.id);
  edges.forEach((edge) => {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      // if (!adjacencyList[edge.source]) adjacencyList[edge.source] = [];
      if (!adjacencyList[edge.target]) adjacencyList[edge.target] = [];
      // adjacencyList[edge.source].push(edge.target);
      adjacencyList[edge.target].push(edge.source);
    }
  });

  const graph: Graph = {
    nodes: nodes.reduce((acc, node) => ({ ...acc, [node.id]: node }), {}),
    edges: edges.reduce((acc, edge) => ({ ...acc, [edge.id]: edge }), {}),
    adjacencyList,
    topologicallySortedNodes: topologicalSort(adjacencyList),
  };
  return graph;
};
