import { generateJSON, JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { toast } from "sonner";
import store from "store2";
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { getNode } from "@/api";
import { createConnectedGraph } from "@/components/Graph/utils";
import { extensions } from "@/lib/readOnlyEditor";
import { ExportNode, GraphNode, SpaceNode } from "@/types";

import { getCanvas } from "./canvases";
import { proseMirrorJSONToText } from "./proseMirror";
import { readOnlyEditor } from "./readOnlyEditor";
import { createConnectedYDoc } from "./utils";

type FormatReturnType<T extends "plain" | "json"> = T extends "json" ? JSONContent : string;

export const getNodePageContent = async <T extends "plain" | "json" = "plain">(
  id: string,
  format: T = "plain" as T,
): Promise<FormatReturnType<T> | undefined> => {
  const token = store("coordnet-auth");
  const [editorDoc, editorProvider] = await createConnectedYDoc(`node-editor-${id}`, token);
  try {
    const xml = editorDoc.getXmlFragment("default");
    const json = yXmlFragmentToProsemirrorJSON(xml);
    if (format == "plain") {
      const text = proseMirrorJSONToText(json);
      return text as FormatReturnType<T>;
    }
    if (format == "json") {
      return json as FormatReturnType<T>;
    }
  } catch (e) {
    toast.error("Failed to get node page content");
    console.error("Failed to get node page content", e);
  } finally {
    editorProvider.destroy();
  }
};

export const setNodePageMarkdown = async (markdown: string, id: string) => {
  try {
    await waitForNode(id);
    const html = DOMPurify.sanitize(await marked.parse(markdown));
    const json = generateJSON(html, extensions);
    await setNodePageContent(json, id);
  } catch (error) {
    toast.error("Failed to load new node from API");
    console.error(`Could not find node ${id} after 50 attempts`, error);
  }
};

export const setNodePageContent = async (content: JSONContent, id: string) => {
  const token = store("coordnet-auth");
  const [editorDoc, editorProvider] = await createConnectedYDoc(`node-editor-${id}`, token);
  try {
    const xml = editorDoc.getXmlFragment("default");
    prosemirrorJSONToYXmlFragment(readOnlyEditor.schema, content, xml);
  } catch (error) {
    console.error(error);
    toast.error("Failed to add to node page");
  } finally {
    editorProvider.destroy();
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForNode = async (id: string, maxRetries = 50, retryDelay = 500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getNode(undefined, id);
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.error(`Node not found yet (${attempt}/${maxRetries}):`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to retrieve node after ${maxRetries} attempts`);
      }
      await delay(retryDelay);
    }
  }
};

export const cleanNodeTitle = (title: string | undefined) => {
  return DOMPurify.sanitize(title ?? "", {
    ALLOWED_TAGS: [],
  });
};

export const getNodeExport = async (node: GraphNode, spaceNode: SpaceNode): Promise<ExportNode> => {
  const exportNode: ExportNode = {
    id: node.id,
    width: node.width,
    height: node.height,
    type: node.type,
    title: spaceNode.title,
    position: node.position,
    data: { borderColor: node.data?.borderColor, type: node.data?.type },
    nodes: [],
    edges: [],
  };
  const content = await getNodePageContent(node.id, "json");
  if (content) exportNode.content = content;
  return exportNode;
};

export const slugifyNodeTitle = (title: string): string => {
  return cleanNodeTitle(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-$/, "");
};

export const exportNode = async (
  id: string,
  nodesMap: Y.Map<GraphNode> | undefined,
  spaceMap: Y.Map<SpaceNode> | undefined,
  includeSubNodes = false,
): Promise<ExportNode | null> => {
  const node = nodesMap?.get(id);
  const spaceNode = spaceMap?.get(id);
  if (!node || !spaceNode) throw new Error("Failed to export node, unable to find node");

  const mainExportNode = await getNodeExport(node, spaceNode);

  if (includeSubNodes) {
    const { nodes: canvasNodes, edges } = await getCanvas(id);
    mainExportNode.edges = edges;
    for (const canvasNode of canvasNodes) {
      const spaceNode = spaceMap?.get(canvasNode.id);
      if (!spaceNode) {
        toast.error("Failed to copy one subnode, continuing export...");
        continue;
      }
      const subNode = await getNodeExport(canvasNode, spaceNode);
      mainExportNode.nodes?.push(subNode);
    }
  }
  return mainExportNode;
};

export const importNodeCanvas = async (spaceId: string, graphId: string, node: ExportNode) => {
  const { disconnect, nodesMap, edgesMap, spaceMap } = await createConnectedGraph(
    spaceId!,
    graphId,
  );

  const idMap: { [k: string]: string } = {};
  node.nodes.forEach(async (node) => {
    const id = crypto.randomUUID();
    idMap[node.id] = id;
    nodesMap.set(id, {
      id,
      type: "GraphNode",
      position: node.position,
      style: { width: node.width ? node.width : 200, height: node.height ? node.height : 80 },
      data: node.data ? node.data : {},
    });
    spaceMap.set(id, { id, title: node.title });

    if (node.content) {
      try {
        await waitForNode(id);
        await setNodePageContent(node.content, id);
      } catch (error) {
        toast.error("Failed to load new node from API");
        console.error(`Could not find node ${id} after 50 attempts`, error);
      }
    }
  });

  node.edges.forEach((edge) => {
    const source = idMap[edge.source];
    const target = idMap[edge.target];
    const id = `edge-${source}-${target}`;
    edgesMap.set(id, { id, source, target });
  });

  disconnect();
};
