import { generateJSON, JSONContent } from "@tiptap/core";
import { Node, XYPosition } from "@xyflow/react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import store from "store2";
import * as Y from "yjs";

import { SingleNode } from "@/components/Skills/running/types";
import { ALLOWED_TAGS, FORBID_ATTR } from "@/constants";
import {
  importNodeCanvas,
  setNodePageContent,
  setNodePageMarkdown,
  waitForNode,
} from "@/lib/nodes";
import { readPdf } from "@/lib/pdfjs";
import { extensions } from "@/lib/readOnlyEditor";
import { createConnectedYDoc } from "@/lib/utils";
import {
  BackendEntityType,
  BackendParent,
  CanvasEdge,
  CanvasNode,
  ExportNode,
  NodeType,
  SpaceNode,
} from "@/types";

export const createConnectedCanvas = async (spaceId: string, canvasId: string) => {
  const token = store("coordnet-auth");
  const [spaceDoc, spaceProvider] = await createConnectedYDoc(`space-${spaceId}`, token);
  const [canvasDoc, canvasProvider] = await createConnectedYDoc(`node-graph-${canvasId}`, token);

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

export const handleCanvasDrop = async (
  dataTransfer: React.DragEvent<Element>["dataTransfer"],
  takeSnapshot: () => void,
  parent: BackendParent,
  nodesMap: Y.Map<CanvasNode>,
  spaceMap: Y.Map<SpaceNode>,
  position: XYPosition
) => {
  const transferredHtml = dataTransfer.getData("text/html");

  // If it's a file
  if (dataTransfer && dataTransfer.files.length > 0) {
    const file = dataTransfer.files[0];
    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();

    // Node Import
    if (file.name.endsWith(".coordnode")) {
      try {
        const importNode: ExportNode = JSON.parse(new TextDecoder().decode(arrayBuffer));
        const { title, content, data, nodes } = importNode;
        takeSnapshot();
        const id = await addNodeToCanvas(nodesMap, spaceMap, title, position, content, data);
        if (nodes.length && parent.type === BackendEntityType.SPACE && parent.data)
          await importNodeCanvas(parent.data.id, id, importNode);
      } catch (e) {
        console.log("Error importing node", e);
        toast.error("Error importing node");
      }

      // PDF Import
    } else if (file.type === "application/pdf") {
      try {
        const pdfText = await readPdf(arrayBuffer);
        takeSnapshot();
        addNodeToCanvas(nodesMap, spaceMap, file.name, position, pdfText);
      } catch (e) {
        console.log("Error importing PDF", e);
        toast.error("Error importing PDF");
      }
    }

    // Dragging from editor
  } else if (transferredHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(transferredHtml, "text/html");
    const listItems = doc.querySelectorAll("li");

    // List item
    if (listItems.length > 0) {
      listItems.forEach((li, index) => {
        const liPosition: XYPosition = {
          x: position.x + index * 25,
          y: position.y + index * 50,
        };

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = li.innerHTML;
        tempDiv.querySelectorAll("ul, ol").forEach((subList) => subList.remove());
        const cleaned = DOMPurify.sanitize(tempDiv, { ALLOWED_TAGS, FORBID_ATTR });

        takeSnapshot();
        addNodeToCanvas(nodesMap, spaceMap, cleaned, liPosition);
      });

      // Normal HTML
    } else {
      const cleaned = DOMPurify.sanitize(transferredHtml, { ALLOWED_TAGS, FORBID_ATTR });
      takeSnapshot();
      addNodeToCanvas(nodesMap, spaceMap, cleaned, position);
    }

    // Standard 'add node'
  } else {
    takeSnapshot();
    addNodeToCanvas(nodesMap, spaceMap, "New node", position, "", { editing: true });
  }
};

export const findExtremePositions = (nodes: Node[]) => {
  let minX = 0;
  let maxX = -0;
  let minY = 0;
  let maxY = -0;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return { minX, maxX, minY, maxY };
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

export const setNodeTitleAndContent = async (
  spaceId: string | undefined,
  id: string,
  title: string,
  markdown: string
) => {
  const token = store("coordnet-auth");

  await setNodePageMarkdown(markdown, id);

  const [spaceDoc, spaceProvider] = await createConnectedYDoc(`space-${spaceId}`, token);
  const spaceMap = spaceDoc.getMap<SpaceNode>("nodes");
  const spaceNode = spaceMap.get(id);
  if (spaceNode) spaceMap.set(id, { ...spaceNode, title });
  spaceProvider.destroy();
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
