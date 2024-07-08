import { GraphNode, NodeType } from "@/types";

import { ExecutionContext, Graph, Task } from "./types";
import { isResponseNode } from "./utils";

const isInputNode = (node: GraphNode) => {
  return node?.data?.type === NodeType.Default || isResponseNode(node) || !node?.data?.type;
};

/**
 * Iterates each prompt node in the graph and creates tasks for each prompt.
 *
 * - The prompt node is set as the prompt of the task.
 * - If a prompt node has a response node connected to it, the response node is set as the output
 *   node of the task.
 * - If a prompt node has a 'default' (or node without a type) node connected to it, then that is
 *   set as an input node for the task.
 * - If a prompt node has a loop node connected to it, the nodes connected to the loop node
 *   are iterated and alongside each other input, they are added to a task. This is handled
 *   recursively incase there are multiple loop nodes connected to the prompt node.
 *
 * @param graph - The graph containing the nodes.
 * @param context - The execution context.
 */
export const createTasks = (graph: Graph, context: ExecutionContext) => {
  /**
   * Recursively creates tasks for each combination of loop items.
   *
   * @param baseTask - The base task to be extended with loop items.
   * @param loopItems - An array of arrays containing loop items.
   * @param index - The current index in the loopItems array.
   */
  const createTasksRecursively = (baseTask: Task, loopItems: GraphNode[][], index: number) => {
    // Base case: if all loop items have been processed, add the task to the task list
    if (index === loopItems.length) {
      context.taskList.push({ ...baseTask });
      return;
    }

    // Iterate over the current loop items and create new tasks for each item
    loopItems[index].forEach((loopItem) => {
      const newTask = { ...baseTask, inputNodes: [...baseTask.inputNodes, loopItem] };
      createTasksRecursively(newTask, loopItems, index + 1);
    });
  };

  // Iterate over each node in the graph and process if it's a prompt node
  Object.values(graph.nodes).forEach((node) => {
    if (node.data.type === NodeType.Prompt) {
      // Initialize a base task for the prompt node
      const baseTask: Task = { inputNodes: [], outputNode: null, promptNode: node };
      const loopItems: GraphNode[][] = [];

      // First find the output and normal input nodes
      graph.adjacencyList[node.id].forEach((targetNodeId) => {
        const targetNode = graph.nodes[targetNodeId];

        // Check if the target node is a response node
        if (isResponseNode(targetNode)) {
          baseTask.outputNode = targetNode;
        }

        // If it's an input node then add it to the inputNodes list
        else if (isInputNode(targetNode)) {
          baseTask.inputNodes.push(targetNode);
        }

        // If it's a loop node then collect all the loop items
        else if (targetNode?.data?.type === NodeType.Loop) {
          const items = graph.adjacencyList[targetNode.id]
            .map((loopTargetNodeId) => graph.nodes[loopTargetNodeId])
            .filter(isInputNode);
          loopItems.push(items);
        }
      });

      // If there are loop items, create tasks recursively otherwise add baseTask
      if (loopItems.length > 0) {
        createTasksRecursively(baseTask, loopItems, 0);
      } else {
        context.taskList.push(baseTask);
      }
    }
  });

  // Remove any tasks with empty input nodes
  context.taskList = context.taskList.filter((task) => task.inputNodes.length > 0);

  // Remove any tasks without response nodes
  context.taskList = context.taskList.filter((task) => task.outputNode !== null);
};
