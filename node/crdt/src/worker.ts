import "./instrument";

import {
  addInputNode,
  CanvasEdge,
  CanvasNode,
  cleanSkillJson,
  createCanvas,
  createConnectedYDocServer,
  createTasks,
  ExecutionContext,
  logMemoryUsage,
  NodeType,
  processTasks,
  skillJsonToYdoc,
  skillYdocToJson,
} from "@coordnet/core";
import * as celery from "@prd-thanhnguyenhoang/celery.node";

import { db } from "./db";
import { setWorkerPrefetch } from "./utils";

setInterval(() => {
  logMemoryUsage("Worker");
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

  const [doc, provider] = await createConnectedYDocServer(
    `method-run-${skillRunId}`,
    body[1].authentication
  );

  try {
    const runMap = doc?.getMap("meta");
    runMap.set("status", "error");
    runMap.set("error", String(error));
    console.error("Error executing method", error);
  } finally {
    provider.disconnect();
  }
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

    const [doc, provider] = await createConnectedYDocServer(
      `method-run-${skillRunId}`,
      authentication
    );

    try {
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
      const nodesMap = doc.getMap<CanvasNode>(`${skillId}-canvas-nodes`);
      const edgesMap = doc.getMap<CanvasEdge>(`${skillId}-canvas-edges`);
      const nodes = Array.from(nodesMap.values());
      const canvas = createCanvas(nodes, Array.from(edgesMap.values()));

      const outputNode = nodes.find((node) => node.data.type === NodeType.Output);
      if (!outputNode) {
        console.error("Output node not found");
        return;
      }

      if (runMeta.get("status") !== "cancelled") {
        runMeta.set("status", "running");
        const context: ExecutionContext = {
          authentication,
          taskList: [],
          responses: {},
          outputNode,
        };
        createTasks(canvas, context);
        await processTasks(context, buddy, skillId, doc, false);
        console.log("Task running is completed");
        runMeta.set("status", "success");
        const skillJson = cleanSkillJson(skillYdocToJson(doc));
        await db("nodes_methodnoderun").where("id", methodRunId).update({
          method_data: skillJson,
        });
      }
    } finally {
      provider.disconnect();
    }
  }
);
worker.start();
