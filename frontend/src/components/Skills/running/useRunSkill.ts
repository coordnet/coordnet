import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { BlockerFunction, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createSkillRun } from "@/api";
import { skillYdocToJson } from "@/components/Skills/utils";
import { useCanvas, useNodesContext, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType, Skill, YDocScope } from "@/types";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext, ExecutionPlan } from "./types";
import { createCanvas, setNodesState } from "./utils";

type RunStatus = "idle" | "running" | "canceled" | "success" | "error";

interface RunResult {
  status: "success" | "canceled" | "error";
  error?: unknown;
}

export const useRunSkill = () => {
  const { runId, pageId, versionId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { parent, scope } = useYDoc();
  const { nodes, edges, nodesMap } = useCanvas();
  const { nodesMap: skillNodesMap } = useNodesContext();
  const queryClient = useQueryClient();
  const { buddy } = useBuddy();
  const {
    space: { YDoc: spaceYDoc, synced: spaceSynced },
  } = useYDoc();

  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const cancelRef = useRef(false);

  const skill = parent.type === BackendEntityType.SKILL ? (parent?.data as Skill) : undefined;
  const isYDocReady =
    spaceSynced &&
    (spaceYDoc?.guid === `method-${skill?.id}-new` ||
      spaceYDoc?.guid === `method-${skill?.id}-${versionId}-new`);

  const resetRun = useCallback(() => {
    const nodeIds = nodes.map((node) => node.id);
    setNodesState(nodeIds, nodesMap, "inactive");
  }, [nodes, nodesMap]);

  const runAllTasks = useCallback(async (): Promise<RunResult> => {
    try {
      cancelRef.current = false;

      if (!nodes.length) {
        toast.error("This skill has no nodes");
        return { status: "error" };
      }

      // Prepare the canvas + context
      const canvas = createCanvas(nodes, edges);
      const context: ExecutionContext = { taskList: [], responses: {} };
      createTasks(canvas, context);

      // Process the tasks
      await processTasks(context, buddy, spaceYDoc, skill, skillNodesMap, nodesMap, cancelRef);

      // If user canceled mid-loop
      if (cancelRef.current) {
        return { status: "canceled" };
      }

      return { status: "success" };
    } catch (error) {
      console.error(error);
      return { status: "error", error };
    }
  }, [nodes, edges, buddy, skill, skillNodesMap, nodesMap, spaceYDoc]);

  const runSkill = useCallback(async () => {
    if (runStatus === "running") return;

    if (!buddy) return toast.error("You need to set a Buddy to run a skill");
    if (!skill) return toast.error("Skill not found");

    setRunStatus("running");
    cancelRef.current = false;
    resetRun();

    const result = await runAllTasks();

    if (result.status === "success") {
      setRunStatus("success");

      // Save the skill run
      try {
        const skillJson = skillYdocToJson(spaceYDoc!);
        const response = await createSkillRun({
          method: skill.id,
          method_data: skillJson,
          is_dev_run: scope == YDocScope.READ_WRITE,
          method_version: versionId,
        });
        queryClient.invalidateQueries({ queryKey: ["skills", skill.id, "runs"] });
        navigate(
          `/skills/${skill.id}${versionId ? `/versions/${versionId}` : ""}/runs/${response.id}`,
          { replace: true }
        );
      } catch (error) {
        console.error(error);
        setRunStatus("error");
      }
    } else if (result.status === "canceled") {
      setRunStatus("canceled");
      resetRun();
    } else {
      // It's an error
      setRunStatus("error");
      resetRun();
      toast.error("Failed to complete tasks—check console for details");
    }
  }, [runStatus, buddy, skill, resetRun, runAllTasks, spaceYDoc, queryClient, navigate, versionId]);

  const stopRun = useCallback(() => {
    if (runStatus === "running") {
      cancelRef.current = true;
      setRunStatus("canceled");
      resetRun();
    }
  }, [runStatus, resetRun]);

  const prepareExecutionPlan = useCallback(async (): Promise<ExecutionPlan | undefined> => {
    if (!buddy) {
      toast.error("Buddy not set, cannot prepare plan");
      return;
    }
    const canvas = createCanvas(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };
    createTasks(canvas, context);

    return processTasks(context, buddy, spaceYDoc, skill, skillNodesMap, nodesMap, cancelRef, true);
  }, [buddy, edges, skill, skillNodesMap, nodes, nodesMap, spaceYDoc]);

  const shouldBlock: BlockerFunction = useCallback(
    ({ historyAction, nextLocation }) => {
      // Don't block if we're navigating to a node page
      if (historyAction == "PUSH" && nextLocation.search.startsWith("?nodePage=")) return false;

      // Don't block if we're going to the same page (closing a node page)
      if (historyAction == "PUSH" && nextLocation.pathname == pathname) return false;

      // If it's a new and running run prompt for confirmation
      if (runId === "new" && runStatus === "running") {
        if (!window.confirm("Are you sure you want to stop the run?")) {
          return true;
        }
        cancelRef.current = true;
        stopRun();
        return false;
      }

      return false;
    },
    [pathname, runId, runStatus, stopRun]
  );

  useBlocker(shouldBlock);

  useEffect(() => {
    window.addEventListener("beforeunload", resetRun);
    return () => window.removeEventListener("beforeunload", resetRun);
  }, [resetRun]);

  useEffect(() => {
    if (runId === "new" && !pageId && runStatus === "idle" && isYDocReady && nodes.length > 0) {
      runSkill();
    }
  }, [runId, pageId, isYDocReady, runStatus, nodes]);

  return { runSkill, stopRun, prepareExecutionPlan, resetRun, runStatus, setRunStatus };
};
