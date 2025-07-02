import { Canvas, CanvasNode, ExecutionContext, NodeType, Task } from "../types";
import { isResponseNode } from "./utils";

const isInputNode = (node: CanvasNode) => {
  return (
    node?.data?.type === NodeType.Default ||
    isResponseNode(node) ||
    !node?.data?.type ||
    node?.data?.type === NodeType.ExternalData
  );
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

    if (
      node.data.type !== NodeType.Prompt &&
      node.data.type !== NodeType.PaperFinder &&
      node.data.type !== NodeType.PaperQA &&
      node.data.type !== NodeType.PaperQACollection &&
      node.data.type !== NodeType.FutureHouse
    ) {
      return;
    }

    // Initialize a base task for the prompt node
    const baseTask: Task = { inputNodes: [], outputNode: null, promptNode: node };
    const loopItemsCollector: CanvasNode[][] = [];
    let requiresLooping = false;

    // Find the output node
    for (const key in canvas.adjacencyList) {
      const relations = canvas.adjacencyList[key];
      if (relations.includes(nodeId)) {
        if (baseTask.outputNode !== null) {
          console.warn("Multiple output nodes found for prompt node", node);
        }
        if (
          isResponseNode(canvas.nodes[key]) ||
          canvas.nodes[key].data?.type === NodeType.ExternalData
        ) {
          baseTask.outputNode = canvas.nodes[key];
        } else {
          throw new Error(
            "Prompt, Paper Finder, PaperQA, and FutureHouse Nodes must be connected to a Response Node or an External Data Node."
          );
        }
      }
    }

    // Function to handle nodes connected through a Loop node
    const handleLoopNode = (loopNode: CanvasNode): CanvasNode[] => {
      const itemsInsideLoop =
        canvas.adjacencyList[loopNode.id]
          ?.map((loopTargetNodeId) => canvas.nodes[loopTargetNodeId])
          .filter(isInputNode) ?? []; // Get valid input nodes connected to the Loop node

      // Check if any item inside this loop requires iteration
      if (
        itemsInsideLoop.some(
          (item) => isResponseNode(item) || item.data?.type === NodeType.ExternalData
        )
      ) {
        requiresLooping = true; // Set the main flag if iteration is needed
      }
      return itemsInsideLoop; // Return all items found inside this loop connection
    };

    // Iterate over nodes connected directly to the Prompt/PaperFinder/PaperQA node
    canvas.adjacencyList[node.id]?.forEach((targetNodeId) => {
      const targetNode = canvas.nodes[targetNodeId];
      if (!targetNode) return;

      if (targetNode.data?.type === NodeType.Loop) {
        // If it's a loop node, process its connections
        const itemsFromThisLoop = handleLoopNode(targetNode);
        if (itemsFromThisLoop.length > 0) {
          loopItemsCollector.push(itemsFromThisLoop);
        }
      } else if (isInputNode(targetNode)) {
        // If it's any other valid direct input (Default, Response, ExternalData, etc.)
        // add it to the base task's direct inputs.
        baseTask.inputNodes.push(targetNode);
      } else {
        console.warn(
          `Node ${targetNode.id} (${targetNode.data?.type}) connected directly to ${node.id} (${node.data?.type}) is not a standard input or loop.`
        );
      }
    });

    // Set the loop flag for the task only if requiresLooping was set by any Loop node processing
    baseTask.loop = requiresLooping;

    if (loopItemsCollector.length > 0) {
      // If there were Loop nodes involved, generate tasks recursively.
      // The baseTask already contains any direct inputs found.
      // The recursive function will add the specific loop items for each combination.
      createTasksRecursively(baseTask, loopItemsCollector, 0);
    } else {
      // If no Loop nodes were connected, just add the baseTask if it has inputs.
      if (baseTask.inputNodes.length > 0) {
        context.taskList.push(baseTask);
      } else {
        // If no loops AND no direct inputs skip the task
        console.log(`Task for prompt ${node.id} has no inputs and no loops. Adding task anyway.`);
      }
    }
  });

  // Filter tasks: Ensure they have an output node and input nodes.
  context.taskList = context.taskList.filter((task) => {
    if (!task.outputNode) return false;

    // Filter out tasks without inputs
    if (task.inputNodes.length === 0 && !task.loop) {
      console.warn(
        `Filtering out ${task.promptNode.data.type} task ${task.promptNode.id} due to missing inputs.`
      );
      return false;
    }

    return true;
  });
};
