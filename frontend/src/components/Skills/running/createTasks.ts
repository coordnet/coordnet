import { toast } from "sonner";

import { CanvasNode, NodeType } from "@/types";

import { Canvas, ExecutionContext, Task } from "./types";
import { isResponseNode } from "./utils";

const isInputNode = (node: CanvasNode) => {
  return node?.data?.type === NodeType.Default || isResponseNode(node) || !node?.data?.type;
};

const preprocessInputNode = (canvas: Canvas) => {
  const inputNodeId = Object.keys(canvas.nodes).find(
    (id) => canvas.nodes[id].data.type === NodeType.Input
  );
  if (!inputNodeId) return;

  const inputChildren = canvas.adjacencyList[inputNodeId] ?? [];

  Object.entries(canvas.adjacencyList).forEach(([nodeId, targets]) => {
    if (targets.includes(inputNodeId)) {
      const newTargets = targets.filter((t) => t !== inputNodeId);
      inputChildren.forEach((childId) => {
        if (!newTargets.includes(childId) && childId !== nodeId) {
          newTargets.push(childId);
        }
      });
      canvas.adjacencyList[nodeId] = newTargets;
    }
  });

  delete canvas.adjacencyList[inputNodeId];
};

/**
 * Iterates each prompt node in the canvas and creates tasks for each prompt.
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
 * @param canvas - The canvas containing the nodes.
 * @param context - The execution context.
 */
export const createTasks = (canvas: Canvas, context: ExecutionContext) => {
  // Move nodes connected to the input node to ensure they are connected to the correct nodes
  preprocessInputNode(canvas);

  /**
   * Recursively creates tasks for each combination of loop items.
   *
   * @param baseTask - The base task to be extended with loop items.
   * @param loopItems - An array of arrays containing loop items.
   * @param index - The current index in the loopItems array.
   */
  const createTasksRecursively = (baseTask: Task, loopItems: CanvasNode[][], index: number) => {
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

  // Iterate over each node in the canvas and process if it's a prompt node
  Object.values(canvas.topologicallySortedNodes).forEach((nodeId) => {
    const node = canvas.nodes[nodeId];

    if (node.data.type !== NodeType.Prompt && node.data.type !== NodeType.PaperFinder) {
      return;
    }

    // Initialize a base task for the prompt node
    const baseTask: Task = { inputNodes: [], outputNode: null, promptNode: node };
    const loopItems: CanvasNode[][] = [];

    // Find the output node
    for (const key in canvas.adjacencyList) {
      const relations = canvas.adjacencyList[key];
      if (relations.includes(nodeId)) {
        if (baseTask.outputNode !== null) {
          console.warn("Multiple output nodes found for prompt node", node);
          toast.warning("Note: Multiple output nodes found for prompt, only one will be used.");
        }
        if (isResponseNode(canvas.nodes[key])) {
          baseTask.outputNode = canvas.nodes[key];
        } else {
          toast.error("The output node of a prompt must be a response node.");
          throw new Error("Output node must be a response node");
        }
      }
    }

    const handleLoopNode = (targetNode: CanvasNode) => {
      const items = canvas.adjacencyList[targetNode.id]
        .map((loopTargetNodeId) => canvas.nodes[loopTargetNodeId])
        .filter(isInputNode);
      return items;
    };

    // First find the output and normal input nodes
    canvas.adjacencyList[node.id]?.forEach((targetNodeId) => {
      const targetNode = canvas.nodes[targetNodeId];

      if (node.data.type === NodeType.Prompt) {
        // For Prompt nodes, keep the existing logic
        if (isResponseNode(targetNode) || isInputNode(targetNode)) {
          baseTask.inputNodes.push(targetNode);
        } else if (targetNode?.data?.type === NodeType.Loop) {
          loopItems.push(handleLoopNode(targetNode));
        }
      } else if (node.data.type === NodeType.PaperFinder) {
        // For PaperFinder nodes, only allow response nodes as input
        if (baseTask.outputNode && baseTask.outputNode?.data.type !== NodeType.ResponseMultiple) {
          toast.error("Paper Finder nodes can only have Responses (Many nodes) as output.");
          throw new Error("Paper Finder output must be Responses (Many nodes)");
        } else {
          if (targetNode?.data?.type === NodeType.Loop) {
            loopItems.push(handleLoopNode(targetNode));
          } else {
            baseTask.inputNodes.push(targetNode);
          }
        }
      }
    });

    // If there are loop items, create tasks recursively otherwise add baseTask
    if (loopItems.length > 0) {
      // Check if any loop items contain response nodes
      const containsResponseNode = loopItems.some((items) =>
        items.some((item) => isResponseNode(item))
      );

      if (containsResponseNode) {
        baseTask.loop = true;
      }

      createTasksRecursively(baseTask, loopItems, 0);
    } else {
      context.taskList.push(baseTask);
    }
  });

  // Remove any tasks with empty input nodes
  context.taskList = context.taskList.filter((task) => task.inputNodes.length > 0);

  // Remove any tasks without response nodes
  context.taskList = context.taskList.filter((task) => task.outputNode !== null);
};
