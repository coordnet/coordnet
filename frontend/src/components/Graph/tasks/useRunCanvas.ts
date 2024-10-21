import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useNode, useSpace } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext } from "./types";
import { createGraph, setNodesState } from "./utils";

export const useRunCanvas = () => {
  const { nodes, edges, nodesMap } = useNode();
  const { space, nodesMap: spaceNodesMap } = useSpace();
  const { buddy } = useBuddy();
  const cancelRef = useRef(false); // Ref to track cancellation state

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
      resetCanvas();
      const selectedNodes = selected ? nodes.filter((node) => node.selected) : nodes;
      if (selectedNodes.length === 0) return alert("No nodes selected");
      const graph = createGraph(selectedNodes, edges);
      const context: ExecutionContext = { taskList: [], responses: {} };
      createTasks(graph, context);
      const toastId = toast("RunCanvas");

      toast.info("Running Canvas", {
        id: toastId,
        duration: Infinity,
        cancel: {
          label: "Stop",
          onClick: () => {
            cancelRef.current = true; // Set cancellation flag
            setNodesState(
              selectedNodes.map((node) => node.id),
              nodesMap,
              "inactive",
            );
            toast.info("Stopping...");
          },
        },
      });
      await processTasks(context, buddy, space, spaceNodesMap, nodesMap, cancelRef);
      cancelRef.current = false;
      toast.dismiss(toastId);
    },
    [nodes, edges, buddy, space, spaceNodesMap, nodesMap, resetCanvas],
  );

  const prepareExecutionPlan = useCallback(async () => {
    const graph = createGraph(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };
    createTasks(graph, context);
    return await processTasks(context, buddy, space, spaceNodesMap, nodesMap, cancelRef, true);
  }, [nodes, edges, buddy, space, spaceNodesMap, nodesMap]);

  return { runCanvas, prepareExecutionPlan, resetCanvas };
};
