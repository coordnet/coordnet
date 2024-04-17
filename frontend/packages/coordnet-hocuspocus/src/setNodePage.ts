import { Hocuspocus } from "@hocuspocus/server";
import { Request, Response } from "express";
import { z } from "zod";

import { appendTextToNodePage } from "./utils";

const requestSchema = z.object({
  nodeId: z.string(),
  content: z.string().nullable(),
});

export const setNodePage = async (server: Hocuspocus, req: Request, res: Response) => {
  const result = requestSchema.safeParse(req.body);
  if (result.success === false) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  const { nodeId, content } = result.data;

  if (content) {
    const editorConnection = await server.openDirectConnection(`node-editor-${nodeId}`, {});
    await appendTextToNodePage(editorConnection, content);
  }

  res.send("OK");
};
