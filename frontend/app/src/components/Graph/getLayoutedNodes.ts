import ELK, { ElkExtendedEdge, ElkPort, ElkShape } from "elkjs/lib/elk.bundled.js";
import { Edge } from "reactflow";

import { GraphNode } from "@/types";

export interface ElkNode extends ElkShape {
  id: string;
  children?: ElkNode[];
  ports?: ElkPort[];
  edges?: ElkExtendedEdge[];
}

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": "70",
  "elk.spacing.nodeNode": "40",
};

export const getLayoutedNodes = async (
  nodes: GraphNode[],
  edges: Edge[],
  direction: "DOWN" | "RIGHT",
): Promise<GraphNode[]> => {
  const isHorizontal = direction === "RIGHT";

  // Create a set of valid node IDs
  const validNodeIds = new Set(nodes.map((node) => node.id));

  // Filter edges to include only those that reference valid nodes
  const filteredEdges = edges.filter(
    (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target),
  );

  const graph = {
    id: "root",
    layoutOptions: { ...elkOptions, "elk.direction": direction },
    children: nodes.map((node) => ({
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      width: node.width ?? 200,
      height: node.height ?? 80,
    })),
    edges: filteredEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  console.log(graph);

  try {
    const layoutedGraph = await elk.layout(graph);
    return layoutedGraph?.children?.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    })) as GraphNode[];
  } catch (error) {
    console.error(error);
    return [];
  }
};
