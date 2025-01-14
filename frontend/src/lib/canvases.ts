import { toast } from "sonner";
import store from "store2";

import { GraphEdge, GraphNode } from "@/types";

import { createConnectedYDoc } from "./utils";

export const getCanvas = async (
  id: string,
  methodId?: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  const token = store("coordnet-auth");
  let docName = `node-graph-${id}`;
  if (methodId) {
    docName = `method-${methodId}`;
  }
  const [graphDoc, graphProvider] = await createConnectedYDoc(docName, token);
  try {
    const nodesKey = methodId ? `${id}-canvas-nodes` : "nodes";
    const edgesKey = methodId ? `${id}-canvas-edges` : "edges";
    const nodesMap = graphDoc.getMap<GraphNode>(nodesKey);
    const edgesMap = graphDoc.getMap<GraphEdge>(edgesKey);
    nodes = Array.from(nodesMap.values());
    edges = Array.from(edgesMap.values());
  } catch (error) {
    toast.error("Failed to get canvas");
    console.error("Failed to get canvas", error);
  } finally {
    graphProvider.destroy();
  }
  return { nodes, edges };
};
