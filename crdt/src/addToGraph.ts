import { Hocuspocus } from "@hocuspocus/server";
import { Edge, Node as ReactFlowNode } from "@xyflow/react";
import { Request, Response } from "express";
import * as Y from "yjs";
import { z } from "zod";

import { appendTextToNodePage, findCentralNode } from "./utils";

// Zod schemas
const nodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional().nullable(),
  data: z.record(z.any()).optional().nullable(),
});
type CanvasNode = z.infer<typeof nodeSchema>;

const edgeSchema = z.object({
  source: z.string(),
  target: z.string(),
});
type CanvasEdge = z.infer<typeof edgeSchema>;

const requestSchema = z.object({
  spaceId: z.string(),
  graphId: z.string(),
  nodes: z.array(nodeSchema).nonempty(),
  edges: z.array(edgeSchema).nonempty(),
});

export const addToGraph = async (server: Hocuspocus, req: Request, res: Response) => {
  const result = requestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }

  const { spaceId, graphId, nodes: incomingNodes, edges: incomingEdges } = result.data;

  const docConnection = await server.openDirectConnection(`node-graph-${graphId}`, {});
  const spaceConnection = await server.openDirectConnection(`space-${spaceId}`, {});

  const numNodes = incomingNodes.length;

  try {
    await spaceConnection.transact(async (spaceDoc: Y.Doc) => {
      await docConnection.transact(async (doc: Y.Doc) => {
        const nodesMap: Y.Map<ReactFlowNode> = doc.getMap("nodes");
        const edgesMap: Y.Map<Edge> = doc.getMap("edges");
        const spaceMap = spaceDoc.getMap("nodes");

        const centralNode = findCentralNode(
          incomingEdges.map((edge: CanvasEdge) => edge.source),
          nodesMap,
        );

        if (!centralNode) {
          throw new Error("Central node not found.");
        }

        for (let i = 0; i < incomingNodes.length; i++) {
          const incomingNode: CanvasNode = incomingNodes[i];

          const node: ReactFlowNode = {
            id: incomingNode.id,
            type: "GraphNode",
            position: {
              x: centralNode.position.x + 210 * i - (numNodes * 210) / 2 + 105,
              y: centralNode.position.y + 120,
            },
            style: { width: 200, height: 80 },
            data: incomingNode.data || {},
          };

          await nodesMap.set(node.id, node);

          await spaceMap.set(node.id, { id: incomingNode.id, title: incomingNode.title });

          for (const incomingEdge of incomingEdges) {
            const edgeId = `edge-${incomingEdge.source}-${incomingEdge.target}`;
            const edge: Edge = {
              id: edgeId,
              source: incomingEdge.source,
              target: incomingEdge.target,
            };
            await edgesMap.set(edge.id, edge);
          }

          if (incomingNode.content) {
            const editorConnection = await server.openDirectConnection(
              `node-editor-${incomingNode.id}`,
              {},
            );
            await appendTextToNodePage(editorConnection, incomingNode.content);
            editorConnection.disconnect();
          }
        }
      });
    });

    res.send("OK");
  } catch (error) {
    console.error("Error adding to graph:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    docConnection.disconnect();
    spaceConnection.disconnect();
  }
};
