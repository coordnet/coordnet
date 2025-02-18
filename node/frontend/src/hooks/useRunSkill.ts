import {
  createCanvas,
  createTasks,
  ExecutionContext,
  ExecutionPlan,
  NodeType,
  RunStatus,
  skillJsonToYdoc,
  skillYdocToJson,
} from "@coordnet/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import store from "store2";

import { createSkillRun, executeSkillRun } from "@/api";
import { useCanvas, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { createConnectedYDoc } from "@/lib/utils";
import { YDocScope } from "@/types";

export const useRunSkill = () => {
  const navigate = useNavigate();
  const { runId, pageId, skillId, versionId } = useParams();
  const { nodes, edges, inputNodes } = useCanvas();
  const { buddy } = useBuddy();
  const {
    parent,
    scope,
    space: { YDoc: spaceYDoc, synced: spaceSynced },
  } = useYDoc();

  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<unknown>();
  const runMeta = spaceYDoc?.getMap("meta");

  const isYDocReady = spaceSynced && spaceYDoc?.guid === `method-run-${runId}`;

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
      method_data: {},
      is_dev_run: scope == YDocScope.READ_WRITE,
      method_version: versionId,
    });

    // Set the current canvas YDoc to the new run in the CRDT server
    const token = store("coordnet-auth");
    const [runDoc, runProvider] = await createConnectedYDoc(`method-run-${run.id}`, token);
    const json = skillYdocToJson(spaceYDoc);
    await skillJsonToYdoc(json, runDoc);
    const meta = runDoc.getMap("meta");
    meta.set("status", "pending");
    meta.set("buddy", buddy?.id);
    runProvider.destroy();

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
    const context: ExecutionContext = { taskList: [], responses: {}, outputNode };
    createTasks(canvas, context);

    // return processTasks(context, buddy, spaceYDoc, skill, skillNodesMap, nodesMap, cancelRef, true);
  }, [buddy, edges, nodes]);

  useEffect(() => {
    if (runId && !pageId && status == "pending" && isYDocReady && nodes.length > 0 && buddy) {
      executeSkillRun(runId);
    }
  }, [runId, pageId, status, isYDocReady, nodes, buddy]);
  return { runSkill, prepareExecutionPlan, status, error };
};
