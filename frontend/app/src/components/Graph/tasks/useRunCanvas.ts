import { useCallback } from "react";

import { useNode, useSpace } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";

import { createTasks } from "./createTasks";
import { processTasks } from "./executeTasks";
import { ExecutionContext } from "./types";
import { createGraph, setNodesActive } from "./utils";

export const useRunCanvas = () => {
  const { nodes, edges, nodesMap } = useNode();
  const { space, nodesMap: spaceNodesMap } = useSpace();
  const { buddy } = useBuddy();

  const resetCanvas = useCallback(() => {
    const nodeIds = nodes.map((nodes) => nodes.id);
    setNodesActive(nodeIds, nodesMap, false);
  }, [nodes, nodesMap]);

  const runCanvas = useCallback(
    async (selected: boolean = false) => {
      resetCanvas();
      const selectedNodes = selected ? nodes.filter((node) => node.selected) : nodes;
      if (selectedNodes.length === 0) return alert("No nodes selected");
      const graph = createGraph(selectedNodes, edges);
      const context: ExecutionContext = { taskList: [], responses: {} };
      createTasks(graph, context);
      await processTasks(context, buddy, space, spaceNodesMap, nodesMap);
    },
    [nodes, edges, buddy, space, spaceNodesMap, nodesMap, resetCanvas],
  );

  const prepareExecutionPlan = useCallback(async () => {
    const graph = createGraph(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };
    createTasks(graph, context);
    return await processTasks(context, buddy, space, spaceNodesMap, nodesMap, true);
  }, [nodes, edges, buddy, space, spaceNodesMap, nodesMap]);

  return { runCanvas, prepareExecutionPlan, resetCanvas };
};
