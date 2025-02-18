import "./instrument";

import {
  CanvasEdge,
  CanvasNode,
  createCanvas,
  createTasks,
  ExecutionContext,
  NodeType,
  processTasks,
  skillYdocToJson,
  SpaceNode,
} from "@coordnet/core";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as celery from "@prd-thanhnguyenhoang/celery.node";
import * as Y from "yjs";

import { db } from "./db";

const worker = celery.createWorker(
  "redis://redis:6379/0",
  "redis://redis:6379/0",
  process.env.CELERY_NODE_EXECUTION_QUEUE,
);

worker.setOnFailed(async ({ body, error }) => {
  const skillRun = await db("nodes_methodnoderun").where("id", body[1].method_run_id).first();
  const skillRunId = skillRun?.public_id;

  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: process.env.HOCUSPOCUS_INTERNAL_URL,
    name: `method-run-${skillRunId}`,
    document: doc,
    token: process.env.WEBSOCKET_API_KEY,
  });

  await new Promise<void>((resolve) => provider.on("synced", resolve));

  const runMap = doc?.getMap("meta");
  runMap.set("status", "error");
  runMap.set("error", String(error));
});

worker.register(
  "execute_method",
  async ({ method_id, method_run_id }: { method_id: string; method_run_id: string }) => {
    console.log("Executing method", method_id, method_run_id);
    const skill = await db("nodes_node").where("id", method_id).first();
    const skillRun = await db("nodes_methodnoderun").where("id", method_run_id).first();
    const skillId = skill?.public_id;
    const skillRunId = skillRun?.public_id;

    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: process.env.HOCUSPOCUS_INTERNAL_URL,
      name: `method-run-${skillRunId}`,
      document: doc,
      token: process.env.WEBSOCKET_API_KEY,
    });

    await new Promise<void>((resolve) => provider.on("synced", resolve));
    const runMeta = doc?.getMap("meta");

    const buddyId = runMeta.get("buddy");
    const buddy = await db("buddies_buddy").where("public_id", buddyId).first();
    if (!buddy) {
      throw new Error("Buddy not found");
    }
    console.log("found buddy", buddy);

    // Get information from the skill document
    const nodesMap: Y.Map<CanvasNode> = doc.getMap(`${skillId}-canvas-nodes`);
    const edgesMap: Y.Map<CanvasEdge> = doc.getMap(`${skillId}-canvas-edges`);
    const nodes = Array.from(nodesMap.values());
    const canvas = createCanvas(nodes, Array.from(edgesMap.values()));
    const spaceMap: Y.Map<SpaceNode> = doc.getMap("nodes");

    const outputNode = nodes.find((node) => node.data.type === NodeType.Output);
    if (!outputNode) {
      console.error("Output node not found");
      return;
    }

    runMeta.set("status", "running");
    const context: ExecutionContext = { taskList: [], responses: {}, outputNode };
    createTasks(canvas, context);
    const ref = { current: false };
    await processTasks(context, buddy, doc, spaceMap, nodesMap, ref, false);
    console.log("Task running is completed");
    runMeta.set("status", "success");
    const skillJson = skillYdocToJson(doc);
    await db("nodes_methodnoderun").where("id", method_run_id).update({
      method_data: skillJson,
    });
  },
);
worker.start();
