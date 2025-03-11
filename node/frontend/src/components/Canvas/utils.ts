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
import DOMPurify from "dompurify";
import { toast } from "sonner";
import store from "store2";
import * as Y from "yjs";

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
import { BackendEntityType, BackendParent, ExportNode, SpaceNode } from "@/types";

import { importMarkmap } from "./markmapImport";

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
  position: XYPosition,
  spaceDoc: Y.Doc,
  spaceId: string | undefined,
  canvasId: string | undefined
) => {
  const transferredHtml = dataTransfer.getData("text/html");
  const isSkill = parent.type === BackendEntityType.SKILL;

  // Process the PDFs
  if (
    canvasId &&
    dataTransfer &&
    dataTransfer.items.length > 0 &&
    Array.from(dataTransfer.items).some((item) => item.type === "application/pdf")
  ) {
    takeSnapshot();
    const pdfs = Array.from(dataTransfer.files).filter((file) => file.type === "application/pdf");
    handlePDFImport(pdfs, parent, nodesMap, spaceMap, position, spaceDoc);
    return;
  }

  // If it's a file
  if (dataTransfer && dataTransfer.files.length > 0) {
    const file = dataTransfer.files[0];
    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();

    // Node Import
    if (!isSkill && file.name.endsWith(".coordnode")) {
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

      // Markmap Import
    } else if (!isSkill && file.name.endsWith(".markmap")) {
      const markdown = new TextDecoder().decode(arrayBuffer);

      toast.promise(importMarkmap(spaceId, canvasId, markdown, 100), {
        loading: "Importing Markmap...",
        success: "Markmap Imported",
        error: "Error fetching data",
      });
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

const addNodeToSkillCanvas = async (
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

/**
 * Processes PDF files dropped into the browser and extracts their text content
 * @param dataTransfer DataTransfer object containing the dropped files
 * @param canvasId ID of the canvas to add nodes to
 * @param document Y.Doc instance
 */
export const handlePDFImport = async (
  files: File[],
  parent: BackendParent,
  nodesMap: Y.Map<CanvasNode>,
  spaceMap: Y.Map<SpaceNode>,
  startPosition: XYPosition,
  spaceDoc: Y.Doc
) => {
  const isSkill = parent.type === BackendEntityType.SKILL;
  const totalFiles = files.length;
  let processedFiles = 0;
  const failedFiles: string[] = [];
  const toastId = toast.loading(`Processing PDFs: 0/${totalFiles} complete`);

  try {
    // Process files one by one sequentially and add each to canvas immediately
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      toast.loading(`Processing (${i + 1}/${totalFiles}) "${file.name}"`, { id: toastId });

      try {
        // Get HTML content from PDF
        const arrayBuffer = await file.arrayBuffer();
        const htmlContent = await readPdf(arrayBuffer);
        const title = file.name.replace(/\.pdf$/i, "");

        // Add the node
        const position = {
          x: startPosition.x + (processedFiles % 6) * 210,
          y: startPosition.y + Math.floor(processedFiles / 6) * 50,
        };

        if (isSkill) {
          await addNodeToSkillCanvas(nodesMap, spaceMap, spaceDoc, title, position, htmlContent);
        } else {
          await addNodeToCanvas(nodesMap, spaceMap, title, position, htmlContent);
        }

        processedFiles++;
        toast.loading(`Processing PDFs: ${processedFiles}/${totalFiles} complete`, { id: toastId });
      } catch (error) {
        failedFiles.push(file.name);
        console.error(`Error processing "${file.name}":`, error);
      }
    }

    toast.info(`Processed ${processedFiles} of ${totalFiles} files`, {
      description: failedFiles.length
        ? `Failed to process ${failedFiles.length} files. Check the browser console details.`
        : "",
      duration: Infinity,
      cancel: { label: "OK", onClick: () => toast.dismiss() },
      id: toastId,
    });
    console.error(failedFiles);
  } catch (error) {
    toast.error("Error processing PDF files", {
      id: toastId,
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      duration: 5000,
    });
    console.error("Error during PDF processing:", error);
  }
};
