import "./instrument";

import {
  addInputNode,
  CanvasEdge,
  CanvasNode,
  cleanSkillJson,
  createCanvas,
  createTasks,
  ExecutionContext,
  NodeType,
  processTasks,
  skillJsonToYdoc,
  skillYdocToJson,
} from "@coordnet/core";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as celery from "@prd-thanhnguyenhoang/celery.node";
import * as Y from "yjs";

import { db } from "./db";
import { setWorkerPrefetch } from "./utils";

setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(
    `Worker memory usage: RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}/${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
  );
}, 30000);

const worker = celery.createWorker(
  process.env.CELERY_BROKER_URL,
  process.env.CELERY_BROKER_URL,
  process.env.CELERY_NODE_EXECUTION_QUEUE
);

setWorkerPrefetch(worker);

worker.setOnFailed(async ({ body, error }) => {
  const skillRun = await db("nodes_methodnoderun").where("id", body[1].method_run_id).first();
  const skillRunId = skillRun?.public_id;

  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: process.env.HOCUSPOCUS_INTERNAL_URL,
    name: `method-run-${skillRunId}`,
    document: doc,
    token: body[1].authentication,
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
    authentication,
  }: {
    method_id: string;
    method_run_id: string;
    buddy_id: string;
    method_argument: string;
    authentication: string;
  }) => {
    console.log("Executing method", methodId, methodRunId, buddyId);
    const skill = await db("nodes_node").where("id", methodId).first();
    const skillRun = await db("nodes_methodnoderun").where("id", methodRunId).first();
    const skillId = skill?.public_id;
    const skillRunId = skillRun?.public_id;

    const doc = new Y.Doc();
    new HocuspocusProvider({
      url: process.env.HOCUSPOCUS_INTERNAL_URL,
      name: `method-run-${skillRunId}`,
      document: doc,
      token: authentication,
    });

    if (skillRun.method_data && Object.keys(skillRun.method_data).length > 0) {
      await skillJsonToYdoc(skillRun.method_data, doc);
    } else {
      console.log("No method run data found, getting latest version");
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

    const outputNode = nodes.find((node) => node.data.type === NodeType.Output);
    if (!outputNode) {
      console.error("Output node not found");
      return;
    }

    if (runMeta.get("status") !== "cancelled") {
      runMeta.set("status", "running");
      const context: ExecutionContext = { authentication, taskList: [], responses: {}, outputNode };
      createTasks(canvas, context);
      await processTasks(context, buddy, skillId, doc, false);
      console.log("Task running is completed");
      runMeta.set("status", "success");
      const skillJson = cleanSkillJson(skillYdocToJson(doc));
      await db("nodes_methodnoderun").where("id", methodRunId).update({
        method_data: skillJson,
      });
    }
  }
);
worker.start();
