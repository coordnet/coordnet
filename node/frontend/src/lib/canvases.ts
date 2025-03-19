import { CanvasEdge, CanvasNode } from "@coordnet/core";
import { toast } from "sonner";

import { createConnectedYDoc } from "./utils";

export const getCanvas = async (
  id: string,
  skillId?: string
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> => {
  let nodes: CanvasNode[] = [];
  let edges: CanvasEdge[] = [];
  let docName = `node-graph-${id}`;
  if (skillId) {
    docName = `method-${skillId}`;
  }
  const [canvasDoc, canvasProvider] = await createConnectedYDoc(docName);
  try {
    const nodesKey = skillId ? `${id}-canvas-nodes` : "nodes";
    const edgesKey = skillId ? `${id}-canvas-edges` : "edges";
    const nodesMap = canvasDoc.getMap<CanvasNode>(nodesKey);
    const edgesMap = canvasDoc.getMap<CanvasEdge>(edgesKey);
    nodes = Array.from(nodesMap.values());
    edges = Array.from(edgesMap.values());
  } catch (error) {
    toast.error("Failed to get canvas");
    console.error("Failed to get canvas", error);
  } finally {
    canvasProvider.destroy();
  }
  return { nodes, edges };
};
