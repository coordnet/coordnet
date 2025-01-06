import { generateJSON, JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Edge } from "reactflow";
import { toast } from "sonner";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

import { extensions, readOnlyEditor } from "@/lib/readOnlyEditor";
import { GraphNode, NodeType, SpaceNode } from "@/types";

import { findExtremePositions } from "../utils";
import { Graph, SingleNode } from "./types";

export const setNodesState = (
  nodeIds: string[],
  nodesMap: Y.Map<GraphNode> | undefined,
  state: "active" | "executing" | "inactive" = "active"
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
  document: Y.Doc
) => {
  try {
    const xml = document.getXmlFragment(`${id}-document`);
    prosemirrorJSONToYXmlFragment(readOnlyEditor.schema, content, xml);
  } catch (error) {
    console.error(error);
    toast.error("Failed to add to node page");
  }
};

/**
 * Sets the markdown content for a method node page.
 *
 * @param {string} markdown - The markdown string to be set on the node page.
 * @param {string} id - The identifier of the method node page.
 * @param {Y.Doc} document - The Yjs document where the method node page content is to be set.
 * @returns {Promise<void>} A promise that resolves when the content has been successfully set.
 * @throws Will log an error and display a toast notification if setting the markdown fails.
 */
export const setMethodNodePageMarkdown = async (markdown: string, id: string, document: Y.Doc) => {
  try {
    const html = DOMPurify.sanitize(await marked.parse(markdown));
    const json = generateJSON(html, extensions);
    await setMethodNodePageContent(json, id, document);
  } catch (error) {
    console.error(error);
    toast.error("Failed to set markdown on node page");
  }
};

export const setMethodNodeTitleAndContent = async (
  document: Y.Doc,
  id: string,
  title: string,
  markdown: string
) => {
  await setMethodNodePageMarkdown(markdown, id, document);
  const spaceMap = document.getMap<SpaceNode>("nodes");
  const spaceNode = spaceMap.get(id);
  if (spaceNode) spaceMap.set(id, { ...spaceNode, title });
};

interface AddNodeOptions {
  graphId: string;
  document: Y.Doc;
  nodes: SingleNode[];
}

export const addToMethodGraph = async (options: AddNodeOptions) => {
  const { graphId, nodes, document } = options;
  const nodesMap = document.getMap<GraphNode>(`${graphId}-canvas-nodes`);
  const spaceMap = document.getMap<SpaceNode>("nodes");
  const nodePositions = findExtremePositions(Array.from(nodesMap.values()));

  nodes.forEach(async (node, i) => {
    const id = crypto.randomUUID();
    nodesMap.set(id, {
      id,
      type: "GraphNode",
      position: { x: nodePositions.minX + 210 * i, y: nodePositions.maxY + 120 },
      style: { width: 200, height: 80 },
      data: {},
    });
    spaceMap.set(id, { id, title: node.title });

    if (node.markdown) await setMethodNodePageMarkdown(node.markdown, id, document);
  });
};
