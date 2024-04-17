import { Hocuspocus } from "@hocuspocus/server";
import { Request, Response } from "express";
import { Node as ReactFlowNode } from "reactflow";
import * as Y from "yjs";
import { z } from "zod";

const requestSchema = z.object({
  spaceId: z.string(),
  nodeId: z.string(),
  graphId: z.string(),
  title: z.string(),
  data: z.record(z.any()).optional().nullable(),
});

export const updateNode = async (server: Hocuspocus, req: Request, res: Response) => {
  const result = requestSchema.safeParse(req.body);
  if (result.success === false) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  const { spaceId, nodeId, graphId, title, data } = result.data;

  // Update the title
  const spaceConnection = await server.openDirectConnection(`space-${spaceId}`, {});
  await spaceConnection.transact(async (spaceDoc) => {
    spaceDoc.getMap("nodes").set(nodeId, { id: nodeId, title });
  });
  spaceConnection.disconnect();

  // Update the data if there
  if (data) {
    const docConnection = await server.openDirectConnection(`node-graph-${graphId}`, {});
    await docConnection.transact(async (doc) => {
      const nodesMap: Y.Map<ReactFlowNode> = doc.getMap("nodes");
      const node = nodesMap.get(nodeId);
      if (node) {
        nodesMap.set(nodeId, { ...node, data });
      }
    });
    docConnection.disconnect();
  }

  res.send("OK");
};
