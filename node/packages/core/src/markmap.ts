import { XYPosition } from "@xyflow/react";
import { Transformer } from "markmap-lib";

import { CanvasEdge, ExportNodeSingle } from "./types";

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

export const markmapToExportNode = async (
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
