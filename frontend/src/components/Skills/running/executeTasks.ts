import Instructor, { ResponseModel } from "@instructor-ai/instructor";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { toast } from "sonner";
import * as Y from "yjs";
import { z } from "zod";

import { querySemanticScholar } from "@/api";
import { apiUrl } from "@/constants";
import { getSkillNodePageContent } from "@/lib/nodes";
import { Buddy, CanvasNode, NodeType, Skill, SpaceNode } from "@/types";

import { executeTableTask } from "./tables";
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
  addToSkillCanvas,
  getSkillNodeCanvas,
  isMultipleResponseNode,
  isResponseNode,
  isSingleResponseType,
  isTableResponseType,
  setNodesState,
  setSkillNodeTitleAndContent,
} from "./utils";

const oai = new OpenAI({
  baseURL: apiUrl + "/api/llm/",
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

export const client = Instructor({ client: oai, mode: "TOOLS" });

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
  skillDoc: Y.Doc | undefined,
  skill: Skill | undefined,
  skillNodesMap: Y.Map<SpaceNode> | undefined,
  nodesMap: Y.Map<CanvasNode> | undefined,
  cancelRef: React.RefObject<boolean | null>,
  dryRun: boolean = false
) => {
  if (!buddy) {
    toast.error("Buddy not found");
    return;
  }
  if (!skillDoc) {
    toast.error("Skill yDoc not found");
    return;
  }
  if (!skill) {
    toast.error("Skill not found");
    return;
  }
  if (!skillNodesMap) {
    toast.error("Skill node map not found");
    return;
  }
  if (!nodesMap) {
    toast.error("nodesMap not found");
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
      if (cancelRef.current) {
        setNodesState(selectedIds, nodesMap, "inactive");
        break; // Exit the loop if cancellation is requested
      }

      if (task.promptNode.data.type === NodeType.PaperFinder) {
        const query = await generateKeywords(task, skillDoc, skillNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, query, type: "PAPERS" });
        } else {
          try {
            // setNodesState(selectedIds, nodesMap, "executing");
            setNodesState([task.promptNode.id], nodesMap, "executing");
            await executeKeywordTask(task, skillDoc, query, cancelRef);
          } catch (e) {
            toast.error(`Failed to execute keyword task`);
            console.error(e);
          }
        }
      } else {
        const messages = await generatePrompt(task, buddy, skillDoc, skillNodesMap);
        if (dryRun) {
          executionPlan.tasks.push({ task, messages, type: "PROMPT" });
        } else {
          try {
            // setNodesState(selectedIds, nodesMap, "executing");
            setNodesState([task.promptNode.id], nodesMap, "executing");
            await executePromptTask(task, messages, skillDoc, cancelRef, skillNodesMap);
          } catch (e) {
            toast.error(`Failed to execute prompt task`);
            console.error(e);
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
  spaceNodesMap: Y.Map<SpaceNode>
) => {
  if (isTableResponseType(task.outputNode)) {
    await executeTableTask(task, messages, skillDoc, cancelRef, spaceNodesMap);
    return;
  }

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
      stream: false,
      response_model,
    });

    if (cancelRef.current) return;

    const nodes: SingleNode[] = [];
    if (isSingleResponseType(task.outputNode)) {
      let extractedNode: SingleNodeResponse = {};
      try {
        extractedNode = response;
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
        extractedData = response;
      } catch (e) {
        toast.error("Error when calling LLM, check console for details");
        console.error(e);
      }
      nodes.push(...(extractedData.nodes as SingleNode[]));
    }

    if (cancelRef.current) return;

    if (isMultipleResponseNode(task.outputNode)) {
      await addToSkillCanvas({ canvasId: task?.outputNode?.id ?? "", document: skillDoc, nodes });
    } else {
      setSkillNodeTitleAndContent(
        skillDoc,
        task?.outputNode?.id ?? "",
        nodes[0].title,
        nodes[0].markdown
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
  skillDoc: Y.Doc,
  spaceNodesMap: Y.Map<SpaceNode>
): Promise<ChatCompletionMessageParam[]> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buddy?.system_message },
  ];

  const formatNode = (nodeId: string) => {
    const spaceNode = spaceNodesMap?.get(nodeId);
    const nodePageContent = getSkillNodePageContent(nodeId, skillDoc);
    return ["Title: " + (spaceNode?.title ?? ""), "Content: " + nodePageContent, ""].join("/n");
  };

  for await (const canvasNode of task.inputNodes) {
    if (
      canvasNode.data.type == NodeType.ResponseSingle ||
      canvasNode.data.type == NodeType.ResponseMultiple
    ) {
      const { nodes } = getSkillNodeCanvas(canvasNode.id, skillDoc);
      const content = [];
      for (const node of nodes) {
        const formattedNode = formatNode(node.id);
        content.push(formattedNode);
      }
      messages.push({ role: "user", content: content.join("/n") });
    } else {
      const content = formatNode(canvasNode.id);
      const spaceNode = spaceNodesMap?.get(canvasNode.id);
      messages.push({ role: "user", content, name: formatName(spaceNode?.title ?? "") });
    }
  }
  const spaceNode = spaceNodesMap?.get(task.promptNode.id);
  messages.push({ role: "user", content: spaceNode?.title ?? "" });

  return messages;
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
    toast.info("A request to find papers failed, continuing with the next task");
  }
};

export const generateKeywords = async (
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
