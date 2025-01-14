import { useQueryClient } from "@tanstack/react-query";
import { sleep } from "openai/core.mjs";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { createMethodRun } from "@/api";
import { methodYdocToJson } from "@/components/Methods/utils";
import { useCanvas, useNodesContext } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType } from "@/types";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext } from "./types";
import { createGraph, setNodesState } from "./utils";

export const useRunCanvas = () => {
  const { runId, pageId } = useParams();
  const navigate = useNavigate();
  const { nodes, edges, nodesMap } = useCanvas();
  const { parent, nodesMap: methodNodesMap, yDoc, synced } = useNodesContext();
  const queryClient = useQueryClient();
  const { buddy } = useBuddy();
  const cancelRef = useRef<boolean | null>(null);

  const method = parent.type === BackendEntityType.METHOD ? parent?.data : undefined;

  const resetCanvas = useCallback(() => {
    const nodeIds = nodes.map((nodes) => nodes.id);
    setNodesState(nodeIds, nodesMap, "inactive");
  }, [nodes, nodesMap]);

  // Run reset on refresh/page leave as processing will stop
  useEffect(() => {
    window.addEventListener("beforeunload", resetCanvas);
    return () => window.removeEventListener("beforeunload", resetCanvas);
  }, [resetCanvas]);

  useEffect(() => {
    if (
      runId === "new" &&
      synced &&
      buddy &&
      !pageId &&
      nodes.length > 0 &&
      cancelRef.current === null
    ) {
      runCanvas();
    }
  }, [runId, synced, buddy, pageId, nodes]);

  const runCanvas = useCallback(
    async (selected: boolean = false) => {
      console.log("runCanvas called");
      // TODO: Figure out why this is needed.
      await sleep(250);
      if (cancelRef.current === false) return;
      cancelRef.current = false;
      resetCanvas();
      const selectedNodes = selected ? nodes.filter((node) => node.selected) : nodes;
      if (selectedNodes.length === 0) return alert("No nodes selected");
      const graph = createGraph(selectedNodes, edges);
      const context: ExecutionContext = { taskList: [], responses: {} };
      createTasks(graph, context);
      const toastId = toast("RunCanvas");

      toast.info("Running Method", {
        id: toastId,
        duration: Infinity,
        cancel: {
          label: "Stop",
          onClick: () => {
            cancelRef.current = true;
            setNodesState(
              selectedNodes.map((node) => node.id),
              nodesMap,
              "inactive"
            );
            toast.info("Stopping...");
          },
        },
      });
      await processTasks(context, buddy, yDoc, method, methodNodesMap, nodesMap, cancelRef);
      toast.dismiss(toastId);

      await resetCanvas();
      // TODO: Figure out why this is needed.
      await sleep(100);
      const methodJson = methodYdocToJson(yDoc!);
      console.log("methodjson", methodJson);
      const response = await createMethodRun({
        method: method?.id,
        method_data: methodJson,
        is_dev_run: true,
      });
      queryClient.invalidateQueries({ queryKey: ["methods", method?.id, "runs"] });
      navigate(`/methods/${method?.id}/runs/${response.id}`);
    },
    [nodes, edges, buddy, method, methodNodesMap, nodesMap, resetCanvas]
  );

  const prepareExecutionPlan = useCallback(async () => {
    const graph = createGraph(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };
    createTasks(graph, context);
    return await processTasks(
      context,
      buddy,
      yDoc,
      method,
      methodNodesMap,
      nodesMap,
      cancelRef,
      true
    );
  }, [nodes, edges, buddy, method, methodNodesMap, nodesMap]);

  return { runCanvas, prepareExecutionPlan, resetCanvas, isRunning: cancelRef.current !== null };
};
