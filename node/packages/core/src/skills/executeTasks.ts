import Instructor, { ResponseModel } from "@instructor-ai/instructor";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as Y from "yjs";
import { z } from "zod";

import {
  Buddy,
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
import { executePaperQATask } from "./paperQA";
import { executeTableTask } from "./tables";
import { nodeTemplate, promptTemplate } from "./templates";
import {
  addToSkillCanvas,
  baseURL,
  getSkillNodeCanvas,
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
  skillDoc: Y.Doc | undefined,
  skillNodesMap: Y.Map<SpaceNode> | undefined,
  nodesMap: Y.Map<CanvasNode> | undefined,
  cancelRef: { current: boolean },
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
  if (!skillNodesMap) {
    console.error("Skill node map not found");
    return;
  }
  if (!nodesMap) {
    console.error("nodesMap not found");
    return;
  }

  const executionPlan: ExecutionPlan = { tasks: [] };

  for await (const task of context.taskList) {
    const selectedIds = [task.promptNode.id, ...task.inputNodes.map((node) => node.id)];

    if (cancelRef.current) {
      setNodesState(selectedIds, nodesMap, "inactive");
      break;
    }

    if (!dryRun) setNodesState(selectedIds, nodesMap, "active");

    let tasks = [task];

    if (task?.loop === true) {
      tasks = [];
      const otherNodes = task.inputNodes.filter((node) => !isResponseNode(node));
      for (const inputNode of task.inputNodes) {
        if (isResponseNode(inputNode)) {
          const { nodes: inputNodeNodes } = getSkillNodeCanvas(inputNode.id, skillDoc);
          for (const responseNode of inputNodeNodes) {
            if (cancelRef.current) break;
            tasks.push({ ...task, inputNodes: [...otherNodes, responseNode] });
          }
        }
      }
    }

    for await (const task of tasks) {
      const isLast = task === tasks[tasks.length - 1];

      if (cancelRef.current) {
        setNodesState(selectedIds, nodesMap, "inactive");
        break; // Exit the loop if cancellation is requested
      }

      if (task.promptNode.data.type === NodeType.PaperFinder) {
        const query = await collectInputTitles(task, skillDoc, skillNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, query, type: "PAPERS" });
        } else {
          setNodesState([task.promptNode.id], nodesMap, "executing");
          await executeKeywordTask(task, skillDoc, query, cancelRef);
        }
      } else if (task.promptNode.data.type === NodeType.PaperQA) {
        const query = await collectInputTitles(task, skillDoc, skillNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, query, type: "PAPERQA" });
        } else {
          await executePaperQATask(task, query, skillDoc, nodesMap, context.outputNode, isLast);
        }
      } else {
        const messages = await generatePrompt(
          task,
          buddy,
          skillDoc,
          skillNodesMap,
          context.authentication
        );
        if (dryRun) {
          executionPlan.tasks.push({ task, messages, type: "PROMPT" });
        } else {
          try {
            setNodesState([task.promptNode.id], nodesMap, "executing");
            await executePromptTask(
              task,
              messages,
              skillDoc,
              cancelRef,
              skillNodesMap,
              buddy,
              context.outputNode,
              isLast
            );
          } catch (e) {
            console.error(`Failed to execute prompt task for node ${task.promptNode.id}`);
            console.error(e);

            await setNodesState(
              task.inputNodes.map((node) => node.id),
              nodesMap,
              "error",
              "Prompt failed, context may be too long"
            );
          }
        }
      }
    }
    setNodesState(selectedIds, nodesMap, "inactive");
  }

  return executionPlan;
};

export const executePromptTask = async (
  task: Task,
  messages: ChatCompletionMessageParam[],
  skillDoc: Y.Doc,
  cancelRef: React.RefObject<boolean | null>,
  spaceNodesMap: Y.Map<SpaceNode>,
  buddy: Buddy,
  outputNode: CanvasNode,
  isLastTask: boolean
) => {
  if (isTableResponseType(task.outputNode)) {
    await executeTableTask(
      task,
      messages,
      skillDoc,
      cancelRef,
      spaceNodesMap,
      buddy,
      outputNode,
      isLastTask
    );
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

  if (cancelRef.current) return;

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

  if (cancelRef.current) return;

  if (isMultipleResponseNode(task.outputNode)) {
    [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (canvasId) => {
      if (canvasId) await addToSkillCanvas({ canvasId, document: skillDoc, nodes });
    });
  } else {
    [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (id) => {
      if (id) await setSkillNodeTitleAndContent(skillDoc, id, nodes[0].title, nodes[0].markdown);
    });
  }
};

export const generatePrompt = async (
  task: Task,
  buddy: Buddy,
  skillDoc: Y.Doc,
  spaceNodesMap: Y.Map<SpaceNode>,
  authentication: string
): Promise<ChatCompletionMessageParam[]> => {
  const getNode = (nodeId: string) => {
    return {
      title: spaceNodesMap?.get(nodeId)?.title ?? "",
      content: getSkillNodePageContent(nodeId, skillDoc) ?? "",
    };
  };

  const nodes: string[] = [];
  for await (const canvasNode of task.inputNodes) {
    if (
      canvasNode.data.type == NodeType.ResponseSingle ||
      canvasNode.data.type == NodeType.ResponseMultiple
    ) {
      for (const node of getSkillNodeCanvas(canvasNode.id, skillDoc).nodes) {
        nodes.push(nodeTemplate(getNode(node.id)));
      }
    } else if (canvasNode.data.type === NodeType.ExternalData) {
      if (canvasNode.data?.externalNode?.nodeId) {
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
  skillDoc: Y.Doc,
  query: string,
  cancelRef: React.RefObject<boolean | null>
) => {
  try {
    if (cancelRef.current) return;
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

    if (cancelRef.current) return;

    await addToSkillCanvas({ canvasId: task?.outputNode?.id ?? "", nodes, document: skillDoc });
  } catch (e) {
    console.error(e);
    console.info("A request to find papers failed, continuing with the next task");
  }
};

export const collectInputTitles = async (
  task: Task,
  skillDoc: Y.Doc,
  spaceNodesMap: Y.Map<SpaceNode>
): Promise<string> => {
  let query = "";

  for await (const canvasNode of task.inputNodes) {
    if (
      canvasNode.data.type == NodeType.ResponseSingle ||
      canvasNode.data.type == NodeType.ResponseMultiple
    ) {
      const { nodes } = getSkillNodeCanvas(canvasNode.id, skillDoc);
      for (const node of nodes) {
        const title = spaceNodesMap?.get(node.id)?.title;
        if (title) query += title;
      }
    } else {
      const title = spaceNodesMap?.get(canvasNode.id)?.title;
      if (title) query += title;
    }
  }

  return query;
};
