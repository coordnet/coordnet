import { Edge } from "@xyflow/react";
import ELK, { ElkExtendedEdge, ElkPort, ElkShape } from "elkjs/lib/elk.bundled";
import { v4 as uuidv4 } from "uuid";
import * as Y from "yjs";

import { setSkillNodePageMarkdown } from "./skills";
import { CanvasEdge, CanvasNode, NodeType, SpaceNode } from "./types";

export interface ElkNode extends ElkShape {
  id: string;
  children?: ElkNode[];
  ports?: ElkPort[];
  edges?: ElkExtendedEdge[];
}

const elk = new ELK();

export const getLayoutedNodes = async (
  nodes: CanvasNode[],
  edges: Edge[],
  direction: "DOWN" | "RIGHT"
): Promise<CanvasNode[]> => {
  const isHorizontal = direction === "RIGHT";
  const elkOptions: { [k: string]: string } = {
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.spacing.nodeNode": "40",
    "elk.algorithm": isHorizontal ? "mrtree" : "layered",
  };

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

export const addInputNode = async (skillId: string, doc: Y.Doc, content: string) => {
  const nodesMap: Y.Map<CanvasNode> = doc.getMap(`${skillId}-canvas-nodes`);
  const edgesMap: Y.Map<CanvasEdge> = doc.getMap(`${skillId}-canvas-edges`);
  const nodes = Array.from(nodesMap.values());
  const spaceMap: Y.Map<SpaceNode> = doc.getMap("nodes");
  const inputNode = nodes.find((n) => n.data?.type === NodeType.Input);

  if (!inputNode) {
    throw Error("Could not find an Input node");
  }

  const target = inputNode.id;
  const source = uuidv4();

  if (nodesMap && spaceMap) {
    const newNode: CanvasNode = {
      id: source,
      type: "GraphNode",
      position: { x: inputNode.position.x, y: inputNode.position.y - 140 },
      style: { width: 200, height: 80 },
      data: {},
    };
    spaceMap.set(source, { id: source, title: "Input Node" });
    nodesMap.set(source, newNode);
    setSkillNodePageMarkdown(content, source, doc);

    const id = `edge-${source}target-bottom-${target}target-top`;
    edgesMap?.set(id, {
      id,
      source,
      target,
      sourceHandle: "target-bottom",
      targetHandle: "target-top",
    });
  } else {
    throw Error("Nodes or space map is not available");
  }
  return source;
};
