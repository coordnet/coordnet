import { generateJSON } from "@tiptap/core";
import { Node, ReactFlowInstance, XYPosition } from "reactflow";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";

import { extensions, readOnlyEditor } from "@/lib/readOnlyEditor";
import { GraphNode, SpaceNode } from "@/types";
import { setNodePageContent, waitForNode } from "@/utils";

export const findExtremePositions = (nodes: Node[]) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return { minX, maxX, minY, maxY };
};

export const addNodeToGraph = async (
  reactFlowInstance: ReactFlowInstance,
  nodesMap: Y.Map<GraphNode>,
  spaceNodesMap: Y.Map<SpaceNode>,
  title = "New node",
  body: string | undefined,
  position: XYPosition = { x: 100, y: 100 },
) => {
  const flowPosition = reactFlowInstance.screenToFlowPosition(position);
  if (!flowPosition) alert("Failed to add node");
  const id = uuid();
  const newNode: GraphNode = {
    id,
    type: "GraphNode",
    position: flowPosition,
    style: { width: 200, height: 80 },
    data: { syncing: body ? true : false },
  };
  spaceNodesMap.set(id, { id: id, title });
  nodesMap.set(id, newNode);
  if (!body) return;

  try {
    await waitForNode(id);
    const responseJson = generateJSON(body, extensions);
    setNodePageContent(responseJson, `node-editor-${id}`, readOnlyEditor.schema);
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: {} });
  } catch (error) {
    alert("Failed to load new node from API");
  }
};
