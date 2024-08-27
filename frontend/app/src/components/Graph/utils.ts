import { generateJSON } from "@tiptap/core";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Node, ReactFlowInstance, XYPosition } from "reactflow";
import { toast } from "sonner";
import store from "store2";
import * as Y from "yjs";

import { setNodePageContent, waitForNode } from "@/lib/nodes";
import { extensions } from "@/lib/readOnlyEditor";
import { createConnectedYDoc } from "@/lib/utils";
import { GraphEdge, GraphNode, SpaceNode } from "@/types";

import { SingleNode } from "./tasks/types";

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

export const addNodeToGraph = async (
  reactFlowInstance: ReactFlowInstance,
  nodesMap: Y.Map<GraphNode>,
  spaceNodesMap: Y.Map<SpaceNode>,
  title = "New node",
  body: string | undefined,
  position: XYPosition = { x: 100, y: 100 },
): Promise<string> => {
  const flowPosition = reactFlowInstance.screenToFlowPosition(position);
  if (!flowPosition) alert("Failed to add node");
  const id = crypto.randomUUID();
  const newNode: GraphNode = {
    id,
    type: "GraphNode",
    position: flowPosition,
    style: { width: 200, height: 80 },
    data: { syncing: body ? true : false },
  };
  spaceNodesMap.set(id, { id: id, title });
  nodesMap.set(id, newNode);
  if (!body) return id;

  try {
    await waitForNode(id);
    const responseJson = generateJSON(body, extensions);
    await setNodePageContent(responseJson, id);
    const node = nodesMap.get(id);
    if (node) nodesMap.set(id, { ...node, data: {} });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    alert("Failed to load new node from API");
  }
  return id;
};

export const addEdge = async (
  edgesMap: Y.Map<GraphEdge> | undefined,
  source: string,
  target: string,
  sourceHandle: string = "target-bottom",
  targetHandle: string = "target-top",
): Promise<void> => {
  const id = `edge-${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;

  edgesMap?.set(id, {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  } as GraphEdge);
};

export const findCentralNode = (ids: string[], nodesMap: Y.Map<GraphNode>) => {
  const sourceNodes = ids.map((id) => nodesMap.get(id) as GraphNode);
  const averageX = sourceNodes.reduce((acc, node) => acc + node.position.x, 0) / sourceNodes.length;
  const averageY = sourceNodes.reduce((acc, node) => acc + node.position.y, 0) / sourceNodes.length;
  const centralTargetNode = sourceNodes.reduce(
    (nearest, node) => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - averageX, 2) + Math.pow(node.position.y - averageY, 2),
      );
      return nearest.distance < distance ? nearest : { node, distance };
    },
    { node: sourceNodes[0], distance: Infinity },
  );
  return centralTargetNode.node;
};

interface AddNodeOptions {
  spaceId: string | undefined;
  graphId: string;
  nodes: SingleNode[];
  edges: Array<{ source: string; target: string }>;
}

export const addToGraph = async (options: AddNodeOptions) => {
  const { spaceId, graphId, nodes, edges } = options;
  const token = store("coordnet-auth");

  const [spaceDoc, spaceProvider] = await createConnectedYDoc(`space-${spaceId}`, token);
  const [graphDoc, graphProvider] = await createConnectedYDoc(`node-graph-${graphId}`, token);

  const nodesMap = graphDoc.getMap<GraphNode>("nodes");
  const edgesMap = graphDoc.getMap<GraphEdge>("edges");
  const spaceMap = spaceDoc.getMap<SpaceNode>("nodes");

  const nodePositions = findExtremePositions(Array.from(nodesMap.values()));

  nodes.forEach(async (node, i) => {
    const id = crypto.randomUUID();
    const newNode: GraphNode = {
      id,
      type: "GraphNode",
      position: {
        x: nodePositions.minX + 210 * i,
        y: nodePositions.maxY + 120,
      },
      style: { width: 200, height: 80 },
      data: {},
    };
    nodesMap.set(id, newNode);
    spaceMap.set(id, { id, title: node.title });

    if (node.markdown) {
      try {
        await waitForNode(id);
        const html = DOMPurify.sanitize(await marked.parse(node.markdown));
        const json = generateJSON(html, extensions);
        await setNodePageContent(json, id);
      } catch (error) {
        toast.error("Failed to load new node from API");
        console.error(`Could not find node ${id} after 50 attempts`, error);
      }
    }
  });

  edges.forEach((edge) => {
    const id = `edge-${edge.source}-${edge.target}`;
    edgesMap.set(id, { id, source: edge.source, target: edge.target });
  });

  spaceProvider.destroy();
  graphProvider.destroy();
};

export const setNodeTitleAndContent = async (
  spaceId: string | undefined,
  id: string,
  title: string,
  markdown: string,
) => {
  const token = store("coordnet-auth");

  const html = DOMPurify.sanitize(await marked.parse(markdown));
  const json = generateJSON(html, extensions);
  await setNodePageContent(json, id);

  const [spaceDoc, spaceProvider] = await createConnectedYDoc(`space-${spaceId}`, token);
  const spaceMap = spaceDoc.getMap<SpaceNode>("nodes");
  const spaceNode = spaceMap.get(id);
  if (spaceNode) spaceMap.set(id, { ...spaceNode, title });
  spaceProvider.destroy();
};
