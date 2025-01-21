import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createMethodRun } from "@/api";
import { methodYdocToJson } from "@/components/Methods/utils";
import { useCanvas, useNodesContext, useYDoc } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType, Method } from "@/types";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext, ExecutionPlan } from "./types";
import { createGraph, setNodesState } from "./utils";

type RunStatus = "idle" | "running" | "canceled" | "success" | "error";

interface RunResult {
  status: "success" | "canceled" | "error";
  error?: unknown;
}

export const useRunMethod = () => {
  const { runId, pageId } = useParams();
  const navigate = useNavigate();
  const { nodes, edges, nodesMap } = useCanvas();
  const { parent, nodesMap: methodNodesMap } = useNodesContext();
  const queryClient = useQueryClient();
  const { buddy } = useBuddy();
  const {
    space: { YDoc: spaceYDoc, synced: spaceSynced },
  } = useYDoc();

  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const cancelRef = useRef(false);

  const method = parent.type === BackendEntityType.METHOD ? (parent?.data as Method) : undefined;
  const isYDocReady = spaceSynced && spaceYDoc?.guid === `method-${method?.id}-new`;

  const resetRun = useCallback(() => {
    const nodeIds = nodes.map((node) => node.id);
    setNodesState(nodeIds, nodesMap, "inactive");
  }, [nodes, nodesMap]);

  const runAllTasks = useCallback(async (): Promise<RunResult> => {
    try {
      cancelRef.current = false;

      if (!nodes.length) {
        toast.error("This method has no nodes");
        return { status: "error" };
      }

      // Prepare the graph + context
      const graph = createGraph(nodes, edges);
      const context: ExecutionContext = { taskList: [], responses: {} };
      createTasks(graph, context);

      // Process the tasks
      await processTasks(context, buddy, spaceYDoc, method, methodNodesMap, nodesMap, cancelRef);

      // If user canceled mid-loop
      if (cancelRef.current) {
        return { status: "canceled" };
      }

      return { status: "success" };
    } catch (error) {
      console.error(error);
      return { status: "error", error };
    }
  }, [nodes, edges, buddy, method, methodNodesMap, nodesMap, spaceYDoc]);

  const runMethod = useCallback(async () => {
    if (runStatus === "running") return;

    if (!buddy) return toast.error("You need to set a Buddy to run a method");
    if (!method) return toast.error("Method not found");

    setRunStatus("running");
    cancelRef.current = false;
    resetRun();

    const result = await runAllTasks();

    if (result.status === "success") {
      setRunStatus("success");

      // Save the method run
      try {
        const methodJson = methodYdocToJson(spaceYDoc!);
        const response = await createMethodRun({
          method: method.id,
          method_data: methodJson,
          is_dev_run: true,
        });
        queryClient.invalidateQueries({ queryKey: ["methods", method.id, "runs"] });
        navigate(`/methods/${method.id}/runs/${response.id}`, { replace: true });
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
  }, [runStatus, buddy, method, runAllTasks, queryClient, navigate, resetRun, spaceYDoc]);

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
    const graph = createGraph(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };
    createTasks(graph, context);

    return processTasks(
      context,
      buddy,
      spaceYDoc,
      method,
      methodNodesMap,
      nodesMap,
      cancelRef,
      true
    );
  }, [buddy, edges, method, methodNodesMap, nodes, nodesMap, spaceYDoc]);

  const shouldBlock = useCallback(() => {
    if (runId === "new" && runStatus === "running") {
      if (!window.confirm("Are you sure you want to stop the run?")) {
        return true;
      }
      stopRun();
      return false;
    }
    return false;
  }, [runId, runStatus, stopRun]);

  useBlocker(shouldBlock);

  useEffect(() => {
    window.addEventListener("beforeunload", resetRun);
    return () => window.removeEventListener("beforeunload", resetRun);
  }, [resetRun]);

  useEffect(() => {
    if (runId === "new" && !pageId && runStatus === "idle" && isYDocReady && nodes.length > 0) {
      runMethod();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, pageId, isYDocReady, runStatus, nodes]);

  return { runMethod, stopRun, prepareExecutionPlan, resetRun, runStatus };
};
