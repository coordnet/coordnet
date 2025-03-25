import { getSchema, JSONContent } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Edge } from "@xyflow/react";
import { marked } from "marked";
import { Schema } from "prosemirror-model";
import xss from "xss";
import { prosemirrorJSONToYXmlFragment, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { Canvas, CanvasNode, NodeType, SingleNode, SkillJson, SkillRun, SpaceNode } from "../types";
import { findExtremePositions } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const baseURL = (globalThis as any).process?.env?.BACKEND_URL ?? "";

export const editorExtensions = [StarterKit, Table, TableRow, TableHeader, TableCell, Link];
export const editorSchema: Schema = getSchema(editorExtensions);

export const setNodesState = async (
  nodeIds: string[],
  nodesMap: Y.Map<CanvasNode> | undefined,
  state: "active" | "executing" | "inactive" | "error" = "active",
  error?: string
) => {
  for (const id of nodeIds) {
    const node = nodesMap?.get(id);
    if (node) {
      console.log("error", error);
      const data: CanvasNode["data"] = { ...node.data, state };
      if (error) data.error = error;
      console.log("tha data", data);
      await nodesMap?.set(id, { ...node, data });
    }
  }
};

export const isResponseNode = (node: CanvasNode) => {
  return (
    node?.data?.type === NodeType.ResponseMultiple ||
    node?.data?.type === NodeType.ResponseSingle ||
    node?.data?.type === NodeType.ResponseCombined ||
    node?.data?.type === NodeType.ResponseTable
  );
};

export const isSingleResponseType = (node: CanvasNode | null) => {
  return (
    node?.data?.type === NodeType.ResponseSingle || node?.data?.type === NodeType.ResponseCombined
  );
};

export const isTableResponseType = (node: CanvasNode | null) => {
  return node?.data?.type === NodeType.ResponseTable;
};

export const isMultipleResponseNode = (node: CanvasNode | null) => {
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

export const createCanvas = (nodes: CanvasNode[], edges: Edge[]): Canvas => {
  // Create adjacency list from edges
  const adjacencyList: { [id: string]: string[] } = {};
  const nodeIds = nodes.map((nodes) => nodes.id);
  edges.forEach((edge) => {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      if (!adjacencyList[edge.target]) adjacencyList[edge.target] = [];
      adjacencyList[edge.target].push(edge.source);
    }
  });

  const canvas: Canvas = {
    nodes: nodes.reduce((acc, node) => ({ ...acc, [node.id]: node }), {}),
    edges: edges.reduce((acc, edge) => ({ ...acc, [edge.id]: edge }), {}),
    adjacencyList,
    topologicallySortedNodes: topologicalSort(adjacencyList),
  };
  return canvas;
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
export const getSkillNodeCanvas = (id: string, document: Y.Doc) => {
  const nodesMap = document.getMap<CanvasNode>(`${id}-canvas-nodes`);
  const edgesMap = document.getMap<CanvasNode>(`${id}-canvas-edges`);

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
};

/**
 * Sets the content of a skill node page in the Yjs document.
 *
 * @param content - The ProseMirror JSON content to be set.
 * @param id - The identifier of the node page.
 * @param document - The Yjs document instance.
 * @returns A promise that resolves when the content is successfully set.
 * @throws Will log an error and show a toast notification if the operation fails.
 */
export const setSkillNodePageContent = async (
  content: JSONContent,
  id: string,
  document: Y.Doc
) => {
  try {
    const xml = document.getXmlFragment(`${id}-document`);
    prosemirrorJSONToYXmlFragment(editorSchema, content, xml);
  } catch (error) {
    console.error(error);
    // toast.error("Failed to add to node page");
  }
};

/**
 * Sets the markdown content for a skill node page.
 *
 * @param {string} markdown - The markdown string to be set on the node page.
 * @param {string} id - The identifier of the skill node page.
 * @param {Y.Doc} document - The Yjs document where the skill node page content is to be set.
 * @returns {Promise<void>} A promise that resolves when the content has been successfully set.
 * @throws Will log an error and display a toast notification if setting the markdown fails.
 */
export const setSkillNodePageMarkdown = async (markdown: string, id: string, document: Y.Doc) => {
  try {
    const html = xss(await marked.parse(markdown));
    const json = generateJSON(html, editorExtensions);
    await setSkillNodePageContent(json, id, document);
  } catch (error) {
    console.error(error);
    // toast.error("Failed to set markdown on node page");
  }
};

/**
 * Sets the HTML for a skill node page.
 *
 * @param {string} html - The HTML string to be set on the node page.
 * @param {string} id - The identifier of the skill node page.
 * @param {Y.Doc} document - The Yjs document where the skill node page content is to be set.
 * @returns {Promise<void>} A promise that resolves when the content has been successfully set.
 * @throws Will log an error and display a toast notification if setting the markdown fails.
 */
export const setSkillNodePageHTML = async (html: string, id: string, document: Y.Doc) => {
  try {
    const json = generateJSON(html, editorExtensions);
    await setSkillNodePageContent(json, id, document);
  } catch (error) {
    console.error(error);
    // toast.error("Failed to set markdown on node page");
  }
};

export const setSkillNodeTitleAndContent = async (
  document: Y.Doc,
  id: string,
  title: string,
  markdown: string
) => {
  await setSkillNodePageMarkdown(markdown, id, document);
  const spaceMap = document.getMap<SpaceNode>("nodes");
  const spaceNode = spaceMap.get(id);
  if (spaceNode) spaceMap.set(id, { ...spaceNode, title });
};

interface AddNodeOptions {
  canvasId: string;
  document: Y.Doc;
  nodes: SingleNode[];
}

export const addToSkillCanvas = async (options: AddNodeOptions) => {
  const { canvasId, nodes, document } = options;
  const nodesMap = document.getMap<CanvasNode>(`${canvasId}-canvas-nodes`);
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

    if (node.markdown) await setSkillNodePageMarkdown(node.markdown, id, document);
  });
};

export const skillJsonToYdoc = async (json: { [k: string]: unknown }, document: Y.Doc) => {
  const cleanedJson = cleanSkillJson(json);
  Object.entries(cleanedJson).map(([key, value]) => {
    if (key.endsWith("-document")) {
      const xml = document.getXmlFragment(key);
      prosemirrorJSONToYXmlFragment(editorSchema, value, xml);
    } else {
      const nodes = document.getMap(key);
      Object.entries(value as SkillRun["method_data"]).map(([key, value]) => {
        nodes.set(key, value);
      });
    }
  });
  return document;
};

export const skillYdocToJson = (document: Y.Doc) => {
  const json: SkillJson = {};
  for (const key of document.share.keys()) {
    if (key.endsWith("-document")) {
      json[key] = yDocToProsemirrorJSON(document, key);
    } else {
      json[key] = document.getMap(key).toJSON();
    }
  }
  return cleanSkillJson(json);
};

export const cleanSkillJson = (skillJson: SkillJson): SkillJson => {
  try {
    const referencedNodeIds = new Set<string>();

    // Collect node IDs from all canvas keys
    Object.keys(skillJson)
      .filter((key) => key.endsWith("-canvas-nodes"))
      .forEach((canvasKey) => {
        const canvasNodes = skillJson[canvasKey] || {};
        Object.keys(canvasNodes).forEach((nodeId) => {
          referencedNodeIds.add(nodeId);
        });
      });

    // Clean up unused documents
    Object.keys(skillJson)
      .filter((key) => key.endsWith("-document"))
      .forEach((docKey) => {
        const baseKey = docKey.replace("-document", "");
        if (!referencedNodeIds.has(baseKey)) {
          delete skillJson[docKey];
        }
      });

    // Clean up unused nodes from the nodes object
    if (skillJson.nodes) {
      const initialNodeCount = Object.keys(skillJson.nodes).length;
      Object.keys(skillJson.nodes)
        .filter((nodeId) => !referencedNodeIds.has(nodeId))
        .forEach((nodeId) => {
          delete (skillJson.nodes as { [k: string]: unknown })[nodeId];
        });

      const removedCount = initialNodeCount - Object.keys(skillJson.nodes).length;
      console.log(`Removed ${removedCount} unused nodes in total`);
    }

    return skillJson;
  } catch (err) {
    console.error("Error cleaning skill JSON:", err);
    // Return the original if cleaning failed
    return skillJson;
  }
};
