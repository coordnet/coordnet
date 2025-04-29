import {
  CanvasNode,
  createCanvas,
  createTasks,
  ExecutionContext,
  ExecutionPlan,
  NodeType,
  processTasks,
  RunStatus,
  skillYdocToJson,
  SpaceNode,
} from "@coordnet/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Y from "yjs";

import { createSkillRun, executeSkillRun } from "@/api";
import { useCanvas, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { YDocScope } from "@/types";

export const useRunSkill = () => {
  const navigate = useNavigate();
  const { skillId, versionId } = useParams();
  const { nodes, edges, inputNodes } = useCanvas();
  const { buddy } = useBuddy();
  const {
    parent,
    scope,
    space: { YDoc: spaceYDoc },
  } = useYDoc();

  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<unknown>();
  const runMeta = spaceYDoc?.getMap("meta");

  useEffect(() => {
    const checkStatus = () => {
      const newStatus = runMeta.get("status") as RunStatus;
      const newError = runMeta.get("error");
      if (newStatus != status) setStatus(newStatus);
      if (newError != error) setError(newError);
    };
    runMeta.observe(checkStatus);
    return () => runMeta.unobserve(checkStatus);
  }, [runMeta, status, error]);

  const runSkill = useCallback(async () => {
    const inputNode = nodes.find((node) => node.data.type === NodeType.Input);
    const outputNode = nodes.find((node) => node.data.type === NodeType.Output);
    if (!buddy) {
      return toast.error("You need to set a Buddy to run a skill");
    }
    if (!inputNode)
      return toast.error(
        "This skill is missing an input node. Please add one to indicate where the input data should be added."
      );
    if (!outputNode)
      return toast.error(
        "This skill is missing an output node. Please add one to indicate where the output should be written to."
      );
    if (inputNodes.length === 0)
      return toast.error("Please add at least one input node to run the skill");

    // Create a new run on the backend
    const run = await createSkillRun({
      method: skillId,
      method_data: {
        ...skillYdocToJson(spaceYDoc),
        meta: { buddy: buddy?.id, status: "pending" },
      },
      is_dev_run: scope == YDocScope.READ_WRITE,
      method_version: versionId,
    });

    // Go to the run page and execute it
    await executeSkillRun(run.id);
    navigate(`/skills/${parent.id}${versionId ? `/versions/${versionId}` : ""}/runs/${run.id}`);
  }, [buddy, inputNodes.length, navigate, nodes, parent.id, scope, skillId, spaceYDoc, versionId]);

  const prepareExecutionPlan = useCallback(async (): Promise<ExecutionPlan | undefined> => {
    if (!buddy) {
      toast.error("Buddy not set, cannot prepare plan");
      return;
    }
    const outputNode = nodes.find((node) => node.data.type === NodeType.Output);
    if (!outputNode) {
      toast.error("Output node not found");
      return;
    }

    const canvas = createCanvas(nodes, edges);
    const context: ExecutionContext = {
      authentication: "plan",
      taskList: [],
      responses: {},
      outputNode,
    };
    createTasks(canvas, context);

    const nodesMap: Y.Map<CanvasNode> = spaceYDoc.getMap(`${skillId}-canvas-nodes`);
    const spaceMap: Y.Map<SpaceNode> = spaceYDoc.getMap("nodes");
    const ref = { current: false };
    return await processTasks(context, buddy, spaceYDoc, spaceMap, nodesMap, ref, true);
  }, [buddy, edges, nodes, skillId, spaceYDoc]);

  return { runSkill, prepareExecutionPlan, status, error };
};
