import {
  CanvasEdge,
  CanvasNode,
  findExtremePositions,
  NodeType,
  setSkillNodePageHTML,
  SingleNode,
} from "@coordnet/core";
import { generateJSON, JSONContent } from "@tiptap/core";
import { XYPosition } from "@xyflow/react";
import { toast } from "sonner";
import * as Y from "yjs";

import { setNodePageContent, setNodePageMarkdown, waitForNode } from "@/lib/nodes";
import { extensions } from "@/lib/readOnlyEditor";
import { createConnectedYDoc } from "@/lib/utils";
import { SpaceNode } from "@/types";

export const createConnectedCanvas = async (spaceId: string, canvasId: string) => {
  const [spaceDoc, spaceProvider] = await createConnectedYDoc(`space-${spaceId}`);
  const [canvasDoc, canvasProvider] = await createConnectedYDoc(`node-graph-${canvasId}`);

  return {
    spaceProvider,
    canvasProvider,
    nodesMap: canvasDoc.getMap<CanvasNode>("nodes"),
    edgesMap: canvasDoc.getMap<CanvasEdge>("edges"),
    spaceMap: spaceDoc.getMap<SpaceNode>("nodes"),
    disconnect: () => {
      spaceProvider.destroy();
      canvasProvider.destroy();
    },
  };
};

export const addNodeToCanvas = async (
  nodesMap: Y.Map<CanvasNode>,
  spaceMap: Y.Map<SpaceNode>,
  title = "New node",
  position: XYPosition = { x: 100, y: 100 },
  content?: string | JSONContent | undefined,
  data?: CanvasNode["data"]
): Promise<string> => {
  const id = crypto.randomUUID();
  const newNode: CanvasNode = {
    id,
    type: "GraphNode",
    position,
    style: { width: 200, height: 80 },
    data: { syncing: content ? true : false, ...(data ? data : {}) },
  };
  spaceMap.set(id, { id: id, title });
  nodesMap.set(id, newNode);
  if (!content) return id;

  try {
    await waitForNode(id);
    if (typeof content === "string") {
      const bodyJson = generateJSON(content, extensions);
      await setNodePageContent(bodyJson, id);
    } else {
      await setNodePageContent(content, id);
    }
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: data ? data : {} });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    alert("Failed to load new node from API");
  }
  return id;
};

export const addEdge = async (
  edgesMap: Y.Map<CanvasEdge> | undefined,
  source: string,
  target: string,
  sourceHandle: string = "target-bottom",
  targetHandle: string = "target-top"
): Promise<void> => {
  const id = `edge-${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;
  edgesMap?.set(id, { id, source, target, sourceHandle, targetHandle } as CanvasEdge);
};

export const addNodeToSkillCanvas = async (
  nodesMap: Y.Map<CanvasNode>,
  spaceMap: Y.Map<SpaceNode>,
  document: Y.Doc,
  title: string,
  position: XYPosition,
  content: string
) => {
  const id = crypto.randomUUID();
  nodesMap.set(id, {
    id,
    type: "GraphNode",
    position,
    style: { width: 200, height: 80 },
    data: {},
  });
  spaceMap.set(id, { id, title });

  // Set the HTML content
  if (content) {
    try {
      await setSkillNodePageHTML(content, id, document);
    } catch (error) {
      console.error(`Error setting HTML for node ${id}:`, error);
      toast.error(`Error adding content for "${title}"`, { duration: 3000 });
    }
  }
};

export const findCentralNode = (ids: string[], nodesMap: Y.Map<CanvasNode>) => {
  const sourceNodes = ids.map((id) => nodesMap.get(id) as CanvasNode);
  const averageX = sourceNodes.reduce((acc, node) => acc + node.position.x, 0) / sourceNodes.length;
  const averageY = sourceNodes.reduce((acc, node) => acc + node.position.y, 0) / sourceNodes.length;
  const centralTargetNode = sourceNodes.reduce(
    (nearest, node) => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - averageX, 2) + Math.pow(node.position.y - averageY, 2)
      );
      return nearest.distance < distance ? nearest : { node, distance };
    },
    { node: sourceNodes[0], distance: Infinity }
  );
  return centralTargetNode.node;
};

interface AddNodeOptions {
  spaceId: string | undefined;
  canvasId: string;
  nodes: SingleNode[];
}

export const addToCanvas = async (options: AddNodeOptions) => {
  const { spaceId, canvasId, nodes } = options;
  const { disconnect, nodesMap, spaceMap } = await createConnectedCanvas(spaceId!, canvasId);

  const nodePositions = findExtremePositions(Array.from(nodesMap.values()));

  nodes.forEach(async (node, i) => {
    const id = crypto.randomUUID();
    nodesMap.set(id, {
      id,
      type: "GraphNode",
      position: { x: nodePositions.minX + 210 * i, y: nodePositions.maxY + 120 },
      style: { width: 200, height: 80 },
      data: {},
    });
    spaceMap.set(id, { id, title: node.title });

    if (node.markdown) await setNodePageMarkdown(node.markdown, id);
  });

  disconnect();
};

export const addInputNode = async (
  nodes: CanvasNode[],
  nodesMap: Y.Map<CanvasNode> | undefined,
  edgesMap: Y.Map<CanvasEdge> | undefined,
  spaceMap: Y.Map<SpaceNode> | undefined,
  inputNodes: string[]
) => {
  const inputNode = nodes.find((n) => n.data?.type === NodeType.Input);

  if (!inputNode) {
    toast.error("Could not find an Input node");
    return;
  }

  if (nodesMap && spaceMap) {
    const inputs = nodes.filter((n) => inputNodes.includes(n.id));

    // Add the new node
    const newId = await addNodeToCanvas(
      nodesMap,
      spaceMap,
      "New node",
      {
        x: inputNode.position.x,
        y: inputNode.position.y - 140,
      },
      undefined,
      { editing: true }
    );

    addEdge(edgesMap, newId, inputNode.id);

    // Include the new node in the list for repositioning
    const allNodes = [...inputs, { id: newId, position: { x: 0, y: 0 } }];

    // Define widths/gaps
    const gap = 20;
    const nodeWidth = 200;
    const maxNodesPerRow = 4;
    const rowGap = 100;

    // Split nodes into rows
    const rows = [];
    for (let i = 0; i < allNodes.length; i += maxNodesPerRow) {
      rows.push(allNodes.slice(i, i + maxNodesPerRow));
    }

    // Iterate over each row to calculate positions
    rows.forEach((row, rowIndex) => {
      const rowNodeCount = row.length;
      const totalWidth = rowNodeCount * nodeWidth + (rowNodeCount - 1) * gap;
      const startX = inputNode.position.x - totalWidth / 2 + nodeWidth / 2;
      const newY = inputNode.position.y - 140 - rowIndex * rowGap;

      row.forEach((node, index) => {
        const existingNode = nodesMap.get(node.id);
        if (!existingNode) return;
        nodesMap.set(node.id, {
          ...existingNode,
          position: {
            x: startX + index * (nodeWidth + gap),
            y: newY,
          },
        });
      });
    });
  } else {
    toast.error("Nodes or space map is not available");
  }
};
