import { Hocuspocus } from "@hocuspocus/server";
import { Request, Response } from "express";
import { Edge, Node as ReactFlowNode } from "reactflow";
import * as Y from "yjs";
import { z } from "zod";

import { appendTextToNodePage, findCentralNode } from "./utils";

const nodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional().nullable(),
  data: z.record(z.any()).optional().nullable(),
});

const edgeSchema = z.object({
  source: z.string(),
  target: z.string(),
});

const requestSchema = z.object({
  spaceId: z.string(),
  graphId: z.string(),
  nodes: z.array(nodeSchema).nonempty(),
  edges: z.array(edgeSchema).nonempty(),
});

export const addToGraph = async (server: Hocuspocus, req: Request, res: Response) => {
  const result = requestSchema.safeParse(req.body);
  if (result.success === false) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  const { spaceId, graphId, nodes, edges } = result.data;

  const docConnection = await server.openDirectConnection(`node-graph-${graphId}`, {});
  const spaceConnection = await server.openDirectConnection(`space-${spaceId}`, {});

  const numNodes = nodes.length;
  await spaceConnection.transact(async (spaceDoc) => {
    await docConnection.transact(async (doc) => {
      const nodesMap: Y.Map<ReactFlowNode> = doc.getMap("nodes");
      const edgesMap: Y.Map<Edge> = doc.getMap("edges");
      const spaceMap = spaceDoc.getMap("nodes");

      const centralNode = findCentralNode(
        edges.map((edge) => edge.source),
        nodesMap,
      );

      // For each node, create a GraphNode
      nodes.forEach(async (node, i) => {
        await nodesMap.set(node.id, {
          id: node.id,
          type: "GraphNode",
          position: {
            x: centralNode.position.x + 210 * i - (numNodes * 210) / 2 + 105,
            y: centralNode.position.y + 120,
          },
          style: { width: 200, height: 80 },
          data: "data" in node ? node.data : {},
        });
        await spaceMap.set(node.id, { id: node.id, title: node.title });

        // Populate edges
        edges.forEach(async (edge) => {
          const id = `edge-${edge.source}-${edge.target}`;
          await edgesMap.set(id, { id, ...edge });
        });

        if (!node.content) return;
        const editorConnection = await server.openDirectConnection(`node-editor-${node.id}`, {});
        await appendTextToNodePage(editorConnection, node.content);
      });
    });
  });

  docConnection.disconnect();
  spaceConnection.disconnect();

  res.send("OK");
};
