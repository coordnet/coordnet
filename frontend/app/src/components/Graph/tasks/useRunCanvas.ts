import Instructor from "@instructor-ai/instructor";
import OpenAI from "openai";
import { useCallback } from "react";
import * as Y from "yjs";
import { z } from "zod";

import { useNode, useSpace } from "@/hooks";
import useBuddy from "@/hooks/useBuddy";
import { NodeType, SpaceNode } from "@/types";
import { getCanvasNodes } from "@/utils";

import { addToGraph, setNodeTitleAndContent } from "../utils";
import { createTasks } from "./createTasks";
import { generatePrompt } from "./executeTasks";
import {
  ExecutionContext,
  ExecutionPlan,
  MultipleNodesResponse,
  MultipleNodesSchema,
  SingleNode,
  SingleNodeResponse,
  SingleNodeSchema,
} from "./types";
import { createGraph, isResponseNode, setNodesActive } from "./utils";

const oai = new OpenAI({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api/llm/",
  apiKey: "",
  dangerouslyAllowBrowser: true,
  timeout: 10000,
});

const client = Instructor({ client: oai, mode: "TOOLS" });

function logExecutionPlan(context: ExecutionContext, spaceNodesMap: Y.Map<SpaceNode>) {
  context.taskList.forEach((task, index) => {
    console.log(`Task ${index + 1}:`);
    console.log(
      `  Prompt Node: ${spaceNodesMap?.get(task.promptNode.id)?.title} (ID: ${
        task.promptNode.id
      }, Type: ${task.promptNode.data.type})`,
    );

    console.log(`  Input Nodes:`);
    task.inputNodes.forEach((inputNode) => {
      console.log(
        `    - ${spaceNodesMap?.get(inputNode.id)?.title} (ID: ${inputNode.id}, Type: ${
          inputNode.data.type
        })`,
      );
    });

    if (task.outputNode) {
      console.log(
        `  Output Node: ${spaceNodesMap?.get(task.outputNode.id)?.title} (ID: ${
          task.outputNode.id
        }, Type: ${task.outputNode.data.type})`,
      );
    } else {
      console.log(`  Output Node: None`);
    }
  });
}

export const useRunCanvas = () => {
  const { nodes, edges, nodesMap } = useNode();
  const { space, nodesMap: spaceNodesMap } = useSpace();
  const { buddy } = useBuddy();

  const runCanvas = useCallback(
    async (selected: boolean = false) => {
      if (!buddy) return alert("Buddy not found");
      if (!spaceNodesMap) return alert("Space node map not found");

      resetCanvas();
      const selectedNodes = selected ? nodes.filter((node) => node.selected) : nodes;
      if (selectedNodes.length === 0) return alert("No nodes selected");
      const graph = createGraph(selectedNodes, edges);
      console.log(graph);

      // Initialize execution context
      const context: ExecutionContext = {
        taskList: [],
        responses: {},
      };

      // Create initial tasks
      createTasks(graph, context);

      if (spaceNodesMap) console.log(logExecutionPlan(context, spaceNodesMap));

      let index = 0;
      for await (const task of context.taskList) {
        console.log(`Executing task ${index + 1} of ${context.taskList.length}`);
        console.log(`  Prompt: ${spaceNodesMap?.get(task.promptNode.id)?.title}`);

        console.log("Prompt Node:", task.promptNode);
        console.log("Input Nodes:", task.inputNodes);
        const selectedIds = [task.promptNode.id, ...task.inputNodes.map((node) => node.id)];
        setNodesActive(selectedIds, nodesMap);

        let tasks = [task];

        // If this has a loop, then we need to get the response nodes and create a task for each
        if (task?.loop === true) {
          tasks = [];
          const otherNodes = task.inputNodes.filter((node) => !isResponseNode(node));
          for await (const inputNode of task.inputNodes) {
            if (isResponseNode(inputNode)) {
              const inputNodeNodes = await getCanvasNodes(inputNode.id);
              for await (const responseNode of inputNodeNodes) {
                tasks.push({ ...task, inputNodes: [...otherNodes, responseNode] });
              }
            }
          }
        }

        for await (const task of tasks) {
          const messages = await generatePrompt(task, buddy, spaceNodesMap);
          console.log("Got messages", messages);

          try {
            const response_model: { schema: z.AnyZodObject; name: string } = {
              schema: MultipleNodesSchema,
              name: "MultipleNodes",
            };
            if (
              task.outputNode?.data.type === NodeType.ResponseSingle ||
              task.outputNode?.data.type === NodeType.ResponseCombined
            ) {
              response_model.schema = SingleNodeSchema;
              response_model.name = "SingleNode";
            }
            const response = await client.chat.completions.create({
              messages,
              model: "gpt-4o",
              stream: true,
              response_model,
            });

            const nodes: SingleNode[] = [];

            if (
              task.outputNode?.data.type === NodeType.ResponseCombined ||
              task.outputNode?.data.type === NodeType.ResponseSingle
            ) {
              // TODO: Look into https://island.novy.work/docs/stream-hooks/getting-started
              let extractedNode: SingleNodeResponse = {};
              for await (const result of response) {
                extractedNode = result;
              }
              if (extractedNode) {
                console.log("Adding Single Node", extractedNode);
                nodes.push(extractedNode as SingleNode);
              }
            } else {
              let extractedData: MultipleNodesResponse = {};
              for await (const result of response) {
                extractedData = result;
                // console.log("Partial extraction:", result);
              }
              console.log("Adding nodes", extractedData.nodes);
              nodes.push(...(extractedData.nodes as SingleNode[]));
            }

            if (
              task.outputNode?.data.type === NodeType.ResponseSingle ||
              task.outputNode?.data.type === NodeType.ResponseMultiple
            ) {
              await addToGraph({
                spaceId: space?.id,
                graphId: task?.outputNode?.id ?? "",
                nodes,
                edges: [],
              });
            } else {
              setNodeTitleAndContent(
                space?.id,
                task?.outputNode?.id ?? "",
                nodes[0].title,
                nodes[0].markdown,
              );
            }
          } catch (e) {
            console.error(e);
            alert("Error when calling LLM, check console for details");
          }
        }
        console.log(`Task ${index + 1} completed. Response:`, index);
        resetCanvas();
        index += 1;
      }
    },
    [nodes, edges, nodesMap, spaceNodesMap, buddy],
  );

  const resetCanvas = useCallback(() => {
    const nodeIds = nodes.map((nodes) => nodes.id);
    setNodesActive(nodeIds, nodesMap, false);
  }, [nodes, nodesMap]);

  const prepareExecutionPlan = useCallback(async () => {
    if (!buddy) return alert("Buddy not found");
    if (!spaceNodesMap) return alert("Space node map not found");

    const graph = createGraph(nodes, edges);
    const context: ExecutionContext = { taskList: [], responses: {} };

    createTasks(graph, context);

    const executionPlan: ExecutionPlan = { tasks: [] };

    for await (const task of context.taskList) {
      let tasks = [task];

      // If this has a loop, then we need to get the response nodes and create a task for each
      if (task?.loop === true) {
        tasks = [];
        const otherNodes = task.inputNodes.filter((node) => !isResponseNode(node));
        for await (const inputNode of task.inputNodes) {
          if (isResponseNode(inputNode)) {
            const inputNodeNodes = await getCanvasNodes(inputNode.id);
            for await (const responseNode of inputNodeNodes) {
              tasks.push({ ...task, inputNodes: [...otherNodes, responseNode] });
            }
          }
        }
      }

      for await (const task of tasks) {
        const messages = await generatePrompt(task, buddy, spaceNodesMap);
        executionPlan.tasks.push({
          task: {
            ...task,
            promptNode: {
              ...task.promptNode,
              data: { title: spaceNodesMap?.get(task.promptNode.id)?.title },
            },
            inputNodes: task.inputNodes.map((node) => ({
              ...node,
              data: { title: spaceNodesMap?.get(node.id)?.title },
            })),
            outputNode: task.outputNode
              ? {
                  ...task.outputNode,
                  data: { title: spaceNodesMap?.get(task.outputNode.id)?.title },
                }
              : null,
          },
          messages,
        });
      }
    }

    return executionPlan;
  }, [nodes, edges, nodesMap, spaceNodesMap, buddy]);

  return { runCanvas, prepareExecutionPlan, resetCanvas };
};
