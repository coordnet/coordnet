import { JSONContent } from "@tiptap/core";
import { Edge } from "reactflow";
import { toast } from "sonner";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

import { readOnlyEditor } from "@/lib/readOnlyEditor";
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
    node?.data?.type === NodeType.ResponseCombined ||
    node?.data?.type === NodeType.ResponseTable
  );
};

export const isSingleResponseType = (node: GraphNode | null) => {
  return (
    node?.data?.type === NodeType.ResponseSingle || node?.data?.type === NodeType.ResponseCombined
  );
};

export const isTableResponseType = (node: GraphNode | null) => {
  return node?.data?.type === NodeType.ResponseTable;
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
  const adjacencyList: { [id: string]: string[] } = {};
  const nodeIds = nodes.map((nodes) => nodes.id);
  edges.forEach((edge) => {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      if (!adjacencyList[edge.target]) adjacencyList[edge.target] = [];
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

export function formatTitleToKey(title: string): string {
  return title
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9]/g, "_"); // Replace non-alphanumeric characters with '_'
}

/**
 * Retrieves the nodes and edges from a Yjs document map for a given canvas ID.
 *
 * @param id - The unique identifier for the canvas.
 * @param document - The Yjs document containing the canvas data.
 * @returns An object containing arrays of nodes and edges.
 */
export const getMethodNodeCanvas = (id: string, document: Y.Doc) => {
  const nodesMap = document.getMap<GraphNode>(`${id}-canvas-nodes`);
  const edgesMap = document.getMap<GraphNode>(`${id}-canvas-edges`);

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
};

/**
 * Sets the content of a method node page in the Yjs document.
 *
 * @param content - The ProseMirror JSON content to be set.
 * @param id - The identifier of the node page.
 * @param document - The Yjs document instance.
 * @returns A promise that resolves when the content is successfully set.
 * @throws Will log an error and show a toast notification if the operation fails.
 */
export const setMethodNodePageContent = async (
  content: JSONContent,
  id: string,
  document: Y.Doc,
) => {
  try {
    const xml = document.getXmlFragment(`${id}-document`);
    prosemirrorJSONToYXmlFragment(readOnlyEditor.schema, content, xml);
  } catch (error) {
    console.error(error);
    toast.error("Failed to add to node page");
  }
};
