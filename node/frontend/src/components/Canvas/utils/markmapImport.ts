import { markmapToExportNode } from "@coordnet/core";
import { XYPosition } from "@xyflow/react";
import { toast } from "sonner";

import { setNodePageMarkdown } from "@/lib/nodes";

import { createConnectedCanvas } from "./index";

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
