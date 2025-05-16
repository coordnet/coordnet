import Instructor, { ResponseModel } from "@instructor-ai/instructor";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as Y from "yjs";
import { z } from "zod";

import {
  Buddy,
  CanvasEdge,
  CanvasNode,
  ExecutionContext,
  ExecutionPlan,
  MultipleNodesResponse,
  MultipleNodesSchema,
  NodeType,
  SingleNode,
  SingleNodeResponse,
  SingleNodeSchema,
  SpaceNode,
  Task,
} from "../types";
import { getSkillNodePageContent } from "../utils";
import { getExternalNode, querySemanticScholar } from "./api";
import { setExternalData } from "./externalData";
import { handleMarkMapResponse } from "./markmap";
import { executePaperQACollectionTask, executePaperQATask } from "./paperQA";
import { executeTableTask } from "./tables";
import { nodeTemplate, promptTemplate } from "./templates";
import {
  addToSkillCanvas,
  baseURL,
  createConnectedYDocServer,
  findSourceNode,
  getSkillNodeCanvas,
  isCancelled,
  isMultipleResponseNode,
  isResponseNode,
  isSingleResponseType,
  isTableResponseType,
  setNodesState,
  setSkillNodeTitleAndContent,
} from "./utils";

const oai = new OpenAI({
  baseURL: baseURL + "/api/llm/",
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

export const client = Instructor({ client: oai, mode: "TOOLS" });

export const processTasks = async (
  context: ExecutionContext,
  buddy: Buddy | undefined,
  skillId: string,
  skillDoc: Y.Doc | undefined,
  dryRun: boolean = false
) => {
  if (!buddy) {
    console.error("Buddy not found");
    return;
  }
  if (!skillDoc) {
    console.error("Skill yDoc not found!");
    return;
  }

  const nodesMap: Y.Map<CanvasNode> = skillDoc.getMap(`${skillId}-canvas-nodes`);
  const edgesMap: Y.Map<CanvasEdge> = skillDoc.getMap(`${skillId}-canvas-edges`);
  const spaceMap: Y.Map<SpaceNode> = skillDoc.getMap("nodes");

  const executionPlan: ExecutionPlan = { tasks: [] };

  for await (const task of context.taskList) {
    const taskBuddy = task.promptNode.data.buddy || buddy;
    const selectedIds = [task.promptNode.id, ...task.inputNodes.map((node) => node.id)];
    if (task.outputNode) {
      selectedIds.push(task.outputNode.id);
    }

    // Give the task some time to process before continuing
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (isCancelled(skillDoc)) {
      setNodesState(selectedIds, nodesMap, "inactive");
      break;
    }

    if (!dryRun) setNodesState(selectedIds, nodesMap, "active");

    let tasks = [task];
    let taskResultsProcessed = false;

    if (task?.loop === true) {
      tasks = [];
      const otherNodes = task.inputNodes.filter(
        (node) => !isResponseNode(node) && node.data.type !== NodeType.ExternalData
      );

      for (const inputNode of task.inputNodes) {
        if (isResponseNode(inputNode)) {
          const { nodes: inputNodeNodes } = getSkillNodeCanvas(inputNode.id, skillDoc);
          for (const responseNode of inputNodeNodes) {
            if (isCancelled(skillDoc)) break;

            // Preserve source node information if it exists
            const sourceNodeInfo =
              responseNode.data?.sourceNode ||
              (inputNode.data.type === NodeType.ExternalData
                ? {
                    id: inputNode.id,
                    spaceId: inputNode.data?.externalNode?.spaceId,
                    nodeId: inputNode.data?.externalNode?.nodeId,
                  }
                : undefined);

            tasks.push({
              ...task,
              inputNodes: [...otherNodes, responseNode],
              sourceNodeInfo: sourceNodeInfo,
            });
          }
        } else if (inputNode.data.type === NodeType.ExternalData) {
          const spaceId = inputNode.data?.externalNode?.spaceId ?? "";
          const [canvasDoc, canvasProvider] = await createConnectedYDocServer(
            `node-graph-${inputNode.data?.externalNode?.nodeId}`,
            context.authentication
          );
          const nodes = Array.from(canvasDoc.getMap<CanvasNode>("nodes").values());

          const [spaceDoc, spaceProvider] = await createConnectedYDocServer(
            `space-${inputNode.data?.externalNode?.spaceId}`,
            context.authentication
          );
          const externalSpaceMap = spaceDoc.getMap<SpaceNode>("nodes");

          for (const node of nodes) {
            const spaceNode = externalSpaceMap.get(node.id);
            if (!spaceNode) continue;
            spaceMap.set(node.id, spaceNode);

            // Create source node info with reference to original external node
            const sourceNodeInfo = {
              id: inputNode.id,
              spaceId: inputNode.data?.externalNode?.spaceId,
              nodeId: node.id,
            };

            const newSubNode = {
              ...node,
              data: {
                ...node.data,
                externalNode: { spaceId, nodeId: node.id, depth: 1 },
                sourceNode: sourceNodeInfo,
              },
            };

            tasks.push({
              ...task,
              inputNodes: [...otherNodes, newSubNode],
              sourceNodeInfo: sourceNodeInfo,
            });
          }

          // Close connections
          spaceProvider.disconnect();
          canvasProvider.disconnect();
        }
        // const { nodes: inputNodeNodes } = getSkillNodeCanvas(inputNode.id, skillDoc);
        // for (const responseNode of inputNodeNodes) {
        if (isCancelled(skillDoc)) break;
      }
    }

    for await (const currentSubTask of tasks) {
      const isLastSubTask = currentSubTask === tasks[tasks.length - 1];

      if (isCancelled(skillDoc)) {
        setNodesState(selectedIds, nodesMap, "inactive");
        break;
      }

      try {
        if (currentSubTask.promptNode.data.type === NodeType.PaperFinder) {
          const query = await collectInputTitles(currentSubTask, skillDoc);
          if (dryRun) {
            executionPlan.tasks.push({ task: currentSubTask, query, type: "PAPERS" });
          } else {
            await executeKeywordTask(currentSubTask, skillDoc, query, nodesMap);
            taskResultsProcessed = true;
          }
        } else if (currentSubTask.promptNode.data.type === NodeType.PaperQA) {
          const query = await collectInputTitles(currentSubTask, skillDoc);
          if (dryRun) {
            executionPlan.tasks.push({ task: currentSubTask, query, type: "PAPERQA" });
          } else {
            setNodesState([currentSubTask.promptNode.id], nodesMap, "executing");
            await executePaperQATask(
              currentSubTask,
              query,
              skillDoc,
              nodesMap,
              context.outputNode,
              isLastSubTask
            );
            taskResultsProcessed = true;
          }
        } else if (currentSubTask.promptNode.data.type === NodeType.PaperQACollection) {
          const query = await collectInputTitles(currentSubTask, skillDoc);
          if (dryRun) {
            executionPlan.tasks.push({ task: currentSubTask, query, type: "PAPERQA_COLLECTION" });
          } else {
            setNodesState([currentSubTask.promptNode.id], nodesMap, "executing");
            await executePaperQACollectionTask(
              currentSubTask,
              query,
              skillDoc,
              nodesMap,
              context.outputNode,
              isLastSubTask,
              context.authentication
            );
            taskResultsProcessed = true;
          }
        } else {
          // Default prompt task
          const messages = await generatePrompt(
            currentSubTask,
            taskBuddy,
            skillDoc,
            context.authentication
          );
          if (dryRun) {
            executionPlan.tasks.push({ task: currentSubTask, messages, type: "PROMPT" });
          } else {
            await executePromptTask(
              currentSubTask,
              messages,
              skillDoc,
              taskBuddy,
              context.outputNode,
              isLastSubTask,
              nodesMap
            );
            taskResultsProcessed = true;
          }
        }

        if (taskResultsProcessed && currentSubTask.outputNode && !dryRun) {
          const outputNodeId = currentSubTask.outputNode.id;
          const connectedEdges = Array.from(edgesMap.values()).filter(
            (edge) => edge.source === outputNodeId
          );

          // Update any connected external data nodes immediately
          for (const edge of connectedEdges) {
            const targetNode = nodesMap.get(edge.target);
            if (targetNode?.data?.type === NodeType.ExternalData) {
              await setExternalData(outputNodeId, skillDoc, nodesMap, context, targetNode);
            }
          }
        }
      } catch (e: unknown) {
        // Catch errors during execution
        console.error(`Failed to execute task for node ${currentSubTask.promptNode.id}`);
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Task execution failed";
        await setNodesState(
          [currentSubTask.promptNode.id, ...currentSubTask.inputNodes.map((n) => n.id)],
          nodesMap,
          "error",
          `Execution failed: ${errorMessage.substring(0, 100)}`
        );
      }

      if (isCancelled(skillDoc)) break;
    }

    if (!isCancelled(skillDoc)) {
      setNodesState(selectedIds, nodesMap, "inactive");
    } else {
      setNodesState(selectedIds, nodesMap, "inactive", "Cancelled");
      break;
    }
  }

  return executionPlan;
};

export const executePromptTask = async (
  task: Task,
  messages: ChatCompletionMessageParam[],
  skillDoc: Y.Doc,
  buddy: Buddy,
  outputNode: CanvasNode,
  isLastSubTask: boolean,
  nodesMap: Y.Map<CanvasNode>
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");
    if (isCancelled(skillDoc)) {
      setNodesState([task.promptNode.id], nodesMap, "inactive", "Cancelled");
      return;
    }

    if (isTableResponseType(task.outputNode)) {
      await executeTableTask(task, messages, skillDoc, buddy, outputNode, isLastSubTask);
      setNodesState([task.promptNode.id], nodesMap, "inactive"); // executeTableTask doesn't manage promptNode state
      return;
    }

    const response_model: ResponseModel<z.AnyZodObject> = {
      schema: MultipleNodesSchema,
      name: "MultipleNodes",
    };
    if (isSingleResponseType(task.outputNode)) {
      response_model.schema = SingleNodeSchema;
      response_model.name = "SingleNode";
    }

    const response = await client.chat.completions.create({
      messages,
      model: buddy.model,
      stream: false,
      response_model,
    });

    if (isCancelled(skillDoc)) {
      setNodesState([task.promptNode.id], nodesMap, "inactive", "Cancelled");
      return;
    }

    const nodes: SingleNode[] = [];
    if (isSingleResponseType(task.outputNode)) {
      let extractedNode: SingleNodeResponse = {};
      extractedNode = response;
      if (extractedNode) {
        nodes.push(extractedNode as SingleNode);
      }
    } else {
      let extractedData: MultipleNodesResponse = {};
      extractedData = response;
      nodes.push(...(extractedData.nodes as SingleNode[]));
    }

    if (isCancelled(skillDoc)) {
      setNodesState([task.promptNode.id], nodesMap, "inactive", "Cancelled");
      return;
    }

    // For the task output node and the final output node if it's the last task
    // Important: task.outputNode is the direct output of this prompt. outputNode is the overall skill output.
    const canvasIdsToUpdate = [task.outputNode?.id];
    if (isLastSubTask && outputNode?.id && outputNode.id !== task.outputNode?.id) {
      canvasIdsToUpdate.push(outputNode.id);
    }

    for (const canvasId of canvasIdsToUpdate) {
      if (!canvasId) continue;

      const sourceNode = findSourceNode(task);

      if (task.outputNode?.data?.type === NodeType.ResponseMarkMap) {
        await handleMarkMapResponse(task, nodes, canvasId, skillDoc);
      } else if (
        isMultipleResponseNode(
          task.outputNode && canvasId === task.outputNode.id ? task.outputNode : outputNode
        )
      ) {
        // Determine if the target canvasId corresponds to a multi-response node
        // This logic might need refinement if task.outputNode and outputNode differ significantly in type for the same canvasId
        await addToSkillCanvas({ canvasId, document: skillDoc, nodes, sourceNode });
      } else {
        // Ensure nodes[0] exists, especially if response could be empty
        if (nodes.length > 0) {
          await setSkillNodeTitleAndContent(skillDoc, canvasId, nodes[0].title, nodes[0].markdown);
        } else {
          // Handle case with no nodes from LLM if necessary, e.g. set to empty or specific message
          await setSkillNodeTitleAndContent(
            skillDoc,
            canvasId,
            "Response",
            "(No content from LLM)"
          );
        }
      }
    }
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (e) {
    console.error("Error executing Prompt task", e);
    const errorMessage = e instanceof Error ? e.message : "Prompt task failed";
    setNodesState([task.promptNode.id], nodesMap, "error", errorMessage.substring(0, 100));
    throw e; // Rethrow to allow processTasks to also handle if needed
  }
};

export const generatePrompt = async (
  task: Task,
  buddy: Buddy,
  document: Y.Doc,
  authentication: string
): Promise<ChatCompletionMessageParam[]> => {
  const spaceNodesMap: Y.Map<SpaceNode> = document.getMap("nodes");

  const getNode = (nodeId: string) => {
    return {
      title: spaceNodesMap?.get(nodeId)?.title ?? "",
      content: getSkillNodePageContent(nodeId, document) ?? "",
    };
  };

  const nodes: string[] = [];
  for await (const canvasNode of task.inputNodes) {
    if (
      canvasNode.data.type == NodeType.ResponseSingle ||
      canvasNode.data.type == NodeType.ResponseMultiple ||
      canvasNode.data.type == NodeType.ResponseMarkMap
    ) {
      for (const node of getSkillNodeCanvas(canvasNode.id, document).nodes) {
        nodes.push(nodeTemplate(getNode(node.id)));
      }
    } else if (canvasNode.data.type === NodeType.ExternalData) {
      if (canvasNode.data?.externalNode?.nodeId) {
        console.log("adding external node", canvasNode.data?.externalNode?.nodeId);
        const { title } = getNode(canvasNode.id);
        const content = await getExternalNode(
          canvasNode.data?.externalNode?.nodeId,
          canvasNode.data?.externalNode?.depth,
          authentication
        );
        nodes.push(nodeTemplate({ title, content }));
      }
    } else {
      nodes.push(nodeTemplate(getNode(canvasNode.id)));
    }
  }

  return [
    { role: "system", content: buddy?.system_message },
    { role: "user", content: promptTemplate(nodes, getNode(task.promptNode.id)) },
  ];
};

export const executeKeywordTask = async (
  task: Task,
  document: Y.Doc,
  query: string,
  nodesMap: Y.Map<CanvasNode>
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");
    if (isCancelled(document)) {
      setNodesState([task.promptNode.id], nodesMap, "inactive", "Cancelled");
      return;
    }
    const papers = await querySemanticScholar(query);
    const nodes: SingleNode[] = papers.map((paper) => ({
      title: paper.title,
      markdown: `**Year:** ${paper.year}\n
**Citations:** ${paper.citationCount}\n
**References:** ${paper.referenceCount}\n
**Open Access:** ${paper.isOpenAccess ? "Yes" : "No"}\n
**Authors:** ${paper?.authors?.map((author) => author.name).join(", ")}\n
**Link:** [Semantic Scholar](${paper.url})\n

## Abstract

${paper.abstract}`,
    }));

    if (isCancelled(document)) {
      setNodesState([task.promptNode.id], nodesMap, "inactive", "Cancelled");
      return;
    }

    await addToSkillCanvas({ canvasId: task?.outputNode?.id ?? "", nodes, document });
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (e) {
    console.error("Error executing Keyword task (PaperFinder)", e);
    const errorMessage = e instanceof Error ? e.message : "Keyword task failed";
    setNodesState([task.promptNode.id], nodesMap, "error", errorMessage.substring(0, 100));
    // Optionally rethrow if processTasks should also handle it
  }
};

export const collectInputTitles = async (task: Task, skillDoc: Y.Doc): Promise<string> => {
  const spaceMap: Y.Map<SpaceNode> = skillDoc.getMap("nodes");
  let query = "";

  for await (const canvasNode of task.inputNodes) {
    if (
      canvasNode.data.type == NodeType.ResponseSingle ||
      canvasNode.data.type == NodeType.ResponseMultiple
    ) {
      const { nodes } = getSkillNodeCanvas(canvasNode.id, skillDoc);
      for (const node of nodes) {
        const title = spaceMap?.get(node.id)?.title;
        if (title) query += title + " ";
      }
    } else {
      const title = spaceMap?.get(canvasNode.id)?.title;
      if (title) query += title + " ";
    }
  }

  return query.trim();
};
