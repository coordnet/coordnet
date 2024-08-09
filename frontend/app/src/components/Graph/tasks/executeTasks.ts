import Instructor, { ResponseModel } from "@instructor-ai/instructor";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { toast } from "sonner";
import * as Y from "yjs";
import { z } from "zod";

import { querySemanticScholar } from "@/api";
import { Buddy, GraphNode, NodeType, Space, SpaceNode } from "@/types";
import { getCanvasNodes, getNodePageContent, waitForNode } from "@/utils";

import { addToGraph, setNodeTitleAndContent } from "../utils";
import {
  ExecutionContext,
  ExecutionPlan,
  MultipleNodesResponse,
  MultipleNodesSchema,
  SingleNode,
  SingleNodeResponse,
  SingleNodeSchema,
  Task,
} from "./types";
import {
  isMultipleResponseNode,
  isResponseNode,
  isSingleResponseType,
  setNodesActive,
} from "./utils";

const oai = new OpenAI({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api/llm/",
  apiKey: "",
  dangerouslyAllowBrowser: true,
  timeout: 10000,
});

const client = Instructor({ client: oai, mode: "TOOLS" });

function formatName(input: string) {
  // Replace spaces with underscores
  let converted = input.replace(/\s+/g, "_");

  // Remove any characters that are not alphanumeric, underscore, or hyphen
  converted = converted.replace(/[^a-zA-Z0-9_-]/g, "");

  return converted.slice(0, 50);
}

export const processTasks = async (
  context: ExecutionContext,
  buddy: Buddy | undefined,
  space: Space | undefined,
  spaceNodesMap: Y.Map<SpaceNode> | undefined,
  nodesMap: Y.Map<GraphNode> | undefined,
  dryRun: boolean = false,
) => {
  if (!buddy) return toast.error("Buddy not found");
  if (!space) return toast.error("Space node map not found");
  if (!spaceNodesMap) return toast.error("Space node map not found");
  if (!nodesMap) return toast.error("nodesMap not found");

  const executionPlan: ExecutionPlan = { tasks: [] };

  for await (const task of context.taskList) {
    const selectedIds = [task.promptNode.id, ...task.inputNodes.map((node) => node.id)];
    if (!dryRun) setNodesActive(selectedIds, nodesMap);

    let tasks = [task];

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
      if (task.promptNode.data.type === NodeType.PaperFinder) {
        const query = await generateKeywords(task, spaceNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, query, type: "PAPERS" });
        } else {
          await executeKeywordTask(task, space, query);
        }
      } else {
        const messages = await generatePrompt(task, buddy, spaceNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, messages, type: "PROMPT" });
        } else {
          await executePromptTask(task, space, messages);
        }
      }
    }
    setNodesActive(selectedIds, nodesMap, false);
  }

  return executionPlan;
};

export const executePromptTask = async (
  task: Task,
  space: Space,
  messages: ChatCompletionMessageParam[],
) => {
  try {
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
      model: "gpt-4o",
      stream: true,
      response_model,
    });

    const nodes: SingleNode[] = [];
    if (isSingleResponseType(task.outputNode)) {
      let extractedNode: SingleNodeResponse = {};
      try {
        for await (const result of response) {
          extractedNode = result;
        }
      } catch (e) {
        toast.error("Error when calling LLM, check console for details");
        console.error(e);
      }
      if (extractedNode) {
        nodes.push(extractedNode as SingleNode);
      }
    } else {
      let extractedData: MultipleNodesResponse = {};
      try {
        for await (const result of response) {
          extractedData = result;
        }
      } catch (e) {
        toast.error("Error when calling LLM, check console for details");
        console.error(e);
      }
      nodes.push(...(extractedData.nodes as SingleNode[]));
    }

    if (isMultipleResponseNode(task.outputNode)) {
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
    toast.error("Error when calling LLM, check console for details");
  }
};

export const generatePrompt = async (
  task: Task,
  buddy: Buddy,
  spaceNodesMap: Y.Map<SpaceNode>,
): Promise<ChatCompletionMessageParam[]> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buddy?.system_message },
  ];

  const formatNode = async (nodeId: string) => {
    await waitForNode(nodeId);
    const spaceNode = spaceNodesMap?.get(nodeId);
    const nodePageContent = await getNodePageContent(nodeId);
    return ["Title: " + (spaceNode?.title ?? ""), "Content: " + nodePageContent, ""].join("/n");
  };

  for await (const graphNode of task.inputNodes) {
    if (
      graphNode.data.type == NodeType.ResponseSingle ||
      graphNode.data.type == NodeType.ResponseMultiple
    ) {
      const nodes = await getCanvasNodes(graphNode.id);
      const content = [];
      for (const node of nodes) {
        const formattedNode = await formatNode(node.id);
        content.push(formattedNode);
      }
      messages.push({ role: "user", content: content.join("/n") });
    } else {
      await waitForNode(graphNode.id);
      const content = await formatNode(graphNode.id);
      const spaceNode = spaceNodesMap?.get(graphNode.id);
      messages.push({ role: "user", content, name: formatName(spaceNode?.title ?? "") });
    }
  }
  const spaceNode = spaceNodesMap?.get(task.promptNode.id);
  messages.push({ role: "user", content: spaceNode?.title ?? "" });

  return messages;
};

export const executeKeywordTask = async (task: Task, space: Space, query: string) => {
  try {
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
    await addToGraph({
      spaceId: space?.id,
      graphId: task?.outputNode?.id ?? "",
      nodes,
      edges: [],
    });
  } catch (e) {
    console.error(e);
    toast.info("A request to find papers failed, continuing with the next task");
  }
};

export const generateKeywords = async (
  task: Task,
  spaceNodesMap: Y.Map<SpaceNode>,
): Promise<string> => {
  let query = "";

  for await (const graphNode of task.inputNodes) {
    if (
      graphNode.data.type == NodeType.ResponseSingle ||
      graphNode.data.type == NodeType.ResponseMultiple
    ) {
      const nodes = await getCanvasNodes(graphNode.id);
      for (const node of nodes) {
        const title = spaceNodesMap?.get(node.id)?.title;
        if (title) query += title;
      }
    } else {
      const title = spaceNodesMap?.get(graphNode.id)?.title;
      if (title) query += title;
    }
  }

  return query;
};
