import { CanvasNode } from "@coordnet/core";
import { Edge } from "@xyflow/react";
import ELK, {
  ElkExtendedEdge,
  ElkPort,
  ElkShape,
} from "https://cdn.jsdelivr.net/npm/elkjs@0.9.3/+esm";

export interface ElkNode extends ElkShape {
  id: string;
  children?: ElkNode[];
  ports?: ElkPort[];
  edges?: ElkExtendedEdge[];
}

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "mrtree",
  "elk.layered.spacing.nodeNodeBetweenLayers": "70",
  "elk.spacing.nodeNode": "40",
};

export const getLayoutedNodes = async (
  nodes: CanvasNode[],
  edges: Edge[],
  direction: "DOWN" | "RIGHT"
): Promise<CanvasNode[]> => {
  const isHorizontal = direction === "RIGHT";

  // Create a set of valid node IDs
  const validNodeIds = new Set(nodes.map((node) => node.id));

  // Filter edges to include only those that reference valid nodes
  const filteredEdges = edges.filter(
    (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
  );

  const canvas = {
    id: "root",
    layoutOptions: { ...elkOptions, "elk.direction": direction },
    children: nodes.map((node) => ({
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      width: node.measured?.width ?? 200,
      height: node.measured?.height ?? 80,
    })),
    edges: filteredEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedCanvas = await elk.layout(canvas);
    return layoutedCanvas?.children?.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    })) as CanvasNode[];
  } catch (error) {
    console.error(error);
    return [];
  }
};
