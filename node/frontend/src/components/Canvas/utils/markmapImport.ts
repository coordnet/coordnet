import { CanvasEdge } from "@coordnet/core";
import { XYPosition } from "@xyflow/react";
import { Transformer } from "markmap-lib";
import { toast } from "sonner";

import { setNodePageMarkdown } from "@/lib/nodes";
import { ExportNodeSingle } from "@/types";

import { createConnectedCanvas } from "./index";

type MarkMapNode = Omit<ExportNodeSingle, "content"> & { content?: string };

type MarkMapExport = {
  nodes: MarkMapNode[];
  edges: CanvasEdge[];
};

interface MarkmapTreeNode {
  content?: string;
  value?: string;
  children?: MarkmapTreeNode[];
}

const markmapToExportNode = async (
  markdown: string,
  maxDepth: number,
  startPosition: XYPosition = { x: 0, y: 0 }
): Promise<MarkMapExport> => {
  const transformer = new Transformer();
  const { root } = transformer.transform(markdown);
  const exportNode: MarkMapExport = { nodes: [], edges: [] };

  // Recursively generate a plain-text summary of the node’s children
  const getNodeContent = (node: MarkmapTreeNode): string =>
    node.children && node.children.length > 0
      ? node.children
          .map((child) => -`${child.content || child.value || ""}\n${getNodeContent(child)}`)
          .join("")
      : "";

  // Traverse the markmap tree and add nodes/edges
  const traverseAndAdd = (
    node: MarkmapTreeNode,
    parentId: string | null,
    depth: number,
    position: XYPosition
  ): string | undefined => {
    if (depth > maxDepth) return;
    const currentId = crypto.randomUUID();
    const title = node.content || node.value || "";
    const content = depth === maxDepth ? getNodeContent(node) : undefined;

    exportNode.nodes.push({
      id: currentId,
      title,
      position,
      width: 200,
      height: 80,
      content,
    });

    if (parentId) {
      exportNode.edges.push({
        id: `edge-${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
      });
    }

    if (depth < maxDepth && node.children && node.children.length > 0) {
      const childSpacing = 200;
      const levelSpacing = 150;
      const totalWidth = (node.children.length - 1) * childSpacing;
      const startX = position.x - totalWidth / 2;
      node.children.forEach((child, index) => {
        const childPosition = {
          x: startX + index * childSpacing,
          y: position.y + levelSpacing,
        };
        traverseAndAdd(child, currentId, depth + 1, childPosition);
      });
    }
    return currentId;
  };

  traverseAndAdd(root, null, 0, startPosition);
  return exportNode;
};

export const importMarkmap = async (
  spaceId: string | undefined,
  canvasId: string | undefined,
  markdown: string,
  position: XYPosition,
  maxDepth: number = 6
) => {
  if (!spaceId || !canvasId) throw new Error("Space ID or Canvas ID is missing");

  const { disconnect, nodesMap, edgesMap, spaceMap } = await createConnectedCanvas(
    spaceId,
    canvasId
  );
  const markmapExport = await markmapToExportNode(markdown, maxDepth, position);
  const idMap: Record<string, string> = {};

  // Create nodes on the canvas
  for (const node of markmapExport.nodes) {
    const newId = crypto.randomUUID();
    idMap[node.id] = newId;
    nodesMap.set(newId, {
      id: newId,
      type: "GraphNode",
      position: node.position,
      style: { width: node.width || 200, height: node.height || 80 },
      data: node.data || {},
    });
    spaceMap.set(newId, { id: newId, title: node.title });
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (node.content) {
      try {
        setNodePageMarkdown(node.content, newId);
      } catch (error) {
        toast.error("Failed to load new node from API");
        console.error(`Could not find node ${newId} after 50 attempts`, error);
      }
    }
  }

  // Create edges between nodes
  markmapExport.edges.forEach(async (edge) => {
    const source = idMap[edge.source];
    const target = idMap[edge.target];
    if (source && target) {
      const edgeId = `edge-${source}-${target}`;
      edgesMap.set(edgeId, {
        id: edgeId,
        source,
        target,
        sourceHandle: "target-right",
        targetHandle: "target-left",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  disconnect();
};
