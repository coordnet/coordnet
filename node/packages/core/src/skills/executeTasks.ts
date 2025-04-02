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
import { executePaperQATask } from "./paperQA";
import { executeTableTask } from "./tables";
import { nodeTemplate, promptTemplate } from "./templates";
import {
  addToSkillCanvas,
  baseURL,
  createConnectedYDocServer,
  getSkillNodeCanvas,
  isCancelled,
  isMultipleResponseNode,
  isResponseNode,
  isSingleResponseType,
  isTableResponseType,
  setNodesState,
  setSkillNodeTitleAndContent,
  setSpaceNodePageMarkdown,
  setSpaceNodeTitle,
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

    console.log(task);

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
            tasks.push({ ...task, inputNodes: [...otherNodes, responseNode] });
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
            const newSubNode = {
              ...node,
              data: { ...node.data, externalNode: { spaceId, nodeId: node.id, depth: 1 } },
            };

            tasks.push({ ...task, inputNodes: [...otherNodes, newSubNode] });
          }
          spaceProvider.disconnect();
          canvasProvider.disconnect();
        }
        // const { nodes: inputNodeNodes } = getSkillNodeCanvas(inputNode.id, skillDoc);
        // for (const responseNode of inputNodeNodes) {
        if (isCancelled(skillDoc)) break;
      }
    }

    console.log(JSON.stringify(tasks));

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
            setNodesState([currentSubTask.promptNode.id], nodesMap, "executing");
            await executeKeywordTask(currentSubTask, skillDoc, query);
            taskResultsProcessed = true;
          }
        } else if (currentSubTask.promptNode.data.type === NodeType.PaperQA) {
          const query = await collectInputTitles(currentSubTask, skillDoc);
          if (dryRun) {
            executionPlan.tasks.push({ task: currentSubTask, query, type: "PAPERQA" });
          } else {
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
            setNodesState([currentSubTask.promptNode.id], nodesMap, "executing");
            await executePromptTask(
              currentSubTask,
              messages,
              skillDoc,
              taskBuddy,
              context.outputNode,
              context.authentication,
              isLastSubTask
            );
            taskResultsProcessed = true;
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

    // If there is an attached target node then set the external data
    if (!isCancelled(skillDoc) && taskResultsProcessed && task.outputNode && !dryRun) {
      const outputNodeId = task.outputNode.id;
      const connectedEdges = Array.from(edgesMap.values()).filter(
        (edge) => edge.source === outputNodeId
      );

      for (const edge of connectedEdges) {
        const targetNode = nodesMap.get(edge.target);
        setExternalData(outputNodeId, skillDoc, nodesMap, context, targetNode);
      }
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
  auth: string,
  isLastTask: boolean
) => {
  if (isTableResponseType(task.outputNode)) {
    await executeTableTask(task, messages, skillDoc, buddy, outputNode, isLastTask);
    return;
  }

  // const spaceNodesMap: Y.Map<SpaceNode> = skillDoc.getMap("nodes");

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

  if (isCancelled(skillDoc)) return;

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

  if (isCancelled(skillDoc)) return;

  // For the task output node and the final output node if it's the last task
  [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (canvasId) => {
    if (!canvasId) return;

    if (task.outputNode?.data?.type === NodeType.ResponseMarkMap) {
      await handleMarkMapResponse(task, nodes, canvasId, skillDoc);
    } else if (isMultipleResponseNode(task.outputNode)) {
      await addToSkillCanvas({ canvasId, document: skillDoc, nodes });
    } else if (task?.outputNode?.data.type === NodeType.ExternalData) {
      const externalNode = task?.outputNode?.data.externalNode;
      const spaceId = externalNode?.spaceId;
      if (
        nodes.length === 1 &&
        task.inputNodes.length === 1 &&
        task.inputNodes[0].data.externalNode?.spaceId === spaceId &&
        spaceId
      ) {
        // Update the external node with the new data
        const nodeId = task.inputNodes[0].data.externalNode?.nodeId;
        if (nodeId && nodes[0].title) setSpaceNodeTitle(nodes[0].title, nodeId, spaceId, auth);
        if (nodeId && nodes[0].markdown) setSpaceNodePageMarkdown(nodes[0].markdown, nodeId, auth);
      } else {
        // Just add the node to the external canvas
        console.log("We're adding nodes", "to the output node", task.outputNode.data.externalNode);
        console.log(nodes);
      }
    } else {
      await setSkillNodeTitleAndContent(skillDoc, canvasId, nodes[0].title, nodes[0].markdown);
    }
  });
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

export const executeKeywordTask = async (task: Task, document: Y.Doc, query: string) => {
  try {
    if (isCancelled(document)) return;
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

    if (isCancelled(document)) return;

    await addToSkillCanvas({ canvasId: task?.outputNode?.id ?? "", nodes, document });
  } catch (e) {
    console.error(e);
    console.info("A request to find papers failed, continuing with the next task");
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
