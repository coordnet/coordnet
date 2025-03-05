import "./instrument";

import {
  addInputNode,
  CanvasEdge,
  CanvasNode,
  createCanvas,
  createTasks,
  ExecutionContext,
  NodeType,
  processTasks,
  skillJsonToYdoc,
  skillYdocToJson,
  SpaceNode,
} from "@coordnet/core";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as celery from "@prd-thanhnguyenhoang/celery.node";
import * as Y from "yjs";

import { db } from "./db";

const worker = celery.createWorker(
  process.env.CELERY_BROKER_URL,
  process.env.CELERY_BROKER_URL,
  process.env.CELERY_NODE_EXECUTION_QUEUE
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
  console.error("Error executing method", error);
});

worker.register(
  "execute_method",
  async ({
    method_id: methodId,
    method_run_id: methodRunId,
    buddy_id: buddyId,
    method_argument,
  }: {
    method_id: string;
    method_run_id: string;
    buddy_id: string;
    method_argument: string;
  }) => {
    console.log("Executing method", methodId, methodRunId, buddyId);
    const skill = await db("nodes_node").where("id", methodId).first();
    const skillRun = await db("nodes_methodnoderun").where("id", methodRunId).first();
    const skillId = skill?.public_id;
    const skillRunId = skillRun?.public_id;

    // Check if there is a document in the database we can use
    const document = await db("nodes_document")
      .where("public_id", skillRunId)
      .where("document_type", "METHOD_RUN")
      .first();

    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: process.env.HOCUSPOCUS_INTERNAL_URL,
      name: `method-run-${skillRunId}`,
      document: doc,
      token: process.env.WEBSOCKET_API_KEY,
    });

    await new Promise<void>((resolve) => provider.on("synced", resolve));

    // There is no existing document so get the latest version of the skill and add it
    if (!document) {
      console.log("No existing document found, getting latest version");
      const version = await db("nodes_methodnodeversion")
        .where("method_id", methodId)
        .orderBy("version", "desc")
        .first();
      await skillJsonToYdoc(version?.method_data, doc);
    }

    const runMeta = doc?.getMap("meta");
    if (!buddyId) {
      buddyId = runMeta.get("buddy") as string;
    }
    const buddy = await db("buddies_buddy").where("public_id", buddyId).first();
    if (!buddy) {
      throw new Error("Buddy not found");
    }

    if (method_argument) {
      const inputId = await addInputNode(skillId, doc, method_argument);
      console.log("Method argument found, added", inputId);
    }

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
    await db("nodes_methodnoderun").where("id", methodRunId).update({
      method_data: skillJson,
    });
  }
);
worker.start();
