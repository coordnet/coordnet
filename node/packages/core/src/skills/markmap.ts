import * as Y from "yjs";

import { getLayoutedNodes } from "../canvas";
import { markmapToExportNode } from "../markmap";
import { CanvasEdge, CanvasNode, SingleNode, SpaceNode, Task } from "../types";

export const handleMarkMapResponse = async (
  task: Task,
  nodes: SingleNode[],
  canvasId: string,
  skillDoc: Y.Doc
) => {
  if (!nodes.length) {
    throw new Error("No nodes found");
  }
  console.log(task);
  const markdown = nodes[0].markdown;
  try {
    // Get the markmap nodes and edges
    const result = await markmapToExportNode(markdown, 100, { x: 0, y: 0 });
    let nodes = result.nodes;
    const edges = result.edges;

    // Layout the nodes
    const layoutedNodes = await getLayoutedNodes(nodes as CanvasNode[], edges, "RIGHT");
    nodes = nodes.map((node) => {
      const layoutedNode = layoutedNodes.find((n) => n.id === node.id);
      return { ...node, position: layoutedNode?.position || node.position };
    });

    const nodesMap = skillDoc.getMap<CanvasNode>(`${canvasId}-canvas-nodes`);
    const edgesMap = skillDoc.getMap<CanvasEdge>(`${canvasId}-canvas-edges`);
    const spaceMap = skillDoc.getMap<SpaceNode>("nodes");
    const idMap: Record<string, string> = {};

    for (const node of nodes) {
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
    }

    // Add edges to the document
    for (const edge of edges) {
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
      }
    }

    console.log(`Added ${nodes.length} nodes and ${edges.length} edges to the skill canvas`);
  } catch (error) {
    console.error("Error creating markmap:", error);
    throw new Error(`Failed to create markmap: ${(error as Error)?.message}`);
  }
};
