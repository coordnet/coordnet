import { toast } from "sonner";
import store from "store2";

import { GraphEdge, GraphNode } from "@/types";

import { createConnectedYDoc } from "./utils";

export const getCanvas = async (
  id: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  const token = store("coordnet-auth");
  const [graphDoc, graphProvider] = await createConnectedYDoc(`node-graph-${id}`, token);
  try {
    const nodesMap = graphDoc.getMap<GraphNode>("nodes");
    const edgesMap = graphDoc.getMap<GraphEdge>("edges");
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
