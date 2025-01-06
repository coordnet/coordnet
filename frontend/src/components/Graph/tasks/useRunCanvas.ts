import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useCanvas, useNodesContext } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { BackendEntityType } from "@/types";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext } from "./types";
import { createGraph, setNodesState } from "./utils";

export const useRunCanvas = () => {
  const { nodes, edges, nodesMap } = useCanvas();
  const { parent, nodesMap: methodNodesMap, yDoc } = useNodesContext();
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

  const runCanvas = useCallback(
    async (selected: boolean = false) => {
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
      cancelRef.current = null;
      toast.dismiss(toastId);
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
