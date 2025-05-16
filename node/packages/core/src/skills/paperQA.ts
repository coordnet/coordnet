import * as Y from "yjs";

import { CanvasNode, PaperQAResponse, PaperQAResponsePair, SingleNode, Task } from "../types";
import { queryPaperQA, queryPaperQACollection } from "./api";
import {
  addToSkillCanvas,
  findSourceNode,
  isMultipleResponseNode,
  setNodesState,
  setSkillNodeTitleAndContent,
} from "./utils";

export const convertPairsToObject = (pairs: unknown): Record<string, unknown> => {
  if (!Array.isArray(pairs)) {
    throw new Error("Expected pairs to be an array");
  }
  const obj: Record<string, unknown> = {};
  for (const pair of pairs) {
    if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === "string") {
      const key = pair[0];
      let value = pair[1];
      // If the value is an array of pairs, recursively convert it.
      if (
        Array.isArray(value) &&
        value.every(
          (inner) => Array.isArray(inner) && inner.length === 2 && typeof inner[0] === "string"
        )
      ) {
        value = convertPairsToObject(value);
      }
      obj[key] = value;
    } else {
      console.error("Invalid pair encountered:", pair);
      throw new Error("Invalid PaperQA response format");
    }
  }
  return obj;
};

export const formatPaperQAResponse = (data: unknown): PaperQAResponse => {
  if (Array.isArray(data)) {
    try {
      // Convert the nested pairs into an object recursively.
      return convertPairsToObject(data) as unknown as PaperQAResponse;
    } catch (error) {
      console.error("Error converting pairs to object:", error);
      throw new Error("Failed to format PaperQA response");
    }
  }
  throw new Error("Invalid PaperQA response format");
};

export const paperQAResponseToMd = (data: PaperQAResponse): string => {
  const session = data?.session;
  const bibtex = data?.bibtex ?? {};
  const timing_info = data?.timing_info ?? {};
  const duration = data?.duration ?? 0;

  const timingKey = Object.keys(timing_info)[0];
  const timing = timing_info?.[timingKey];

  // Format BibTeX entries
  const bibtexEntries = Object.entries(bibtex)
    .map(([key, entry]) => `**${key}:**\nbibtex\n${entry}\n`)
    .join("\n\n");

  const tokenCounts = Object.entries(session?.token_counts ?? {})
    .map(
      ([model, counts]) =>
        `- **${model}:** Total tokens: ${counts?.[0] ?? 0}, Secondary: ${counts?.[1] ?? 0}`
    )
    .join("\n  ");

  return `**Question:** ${session?.question ?? ""}\n\n#### Answer\n${session?.answer ?? ""}\n\n---\n\n#### References\n${session?.references ?? ""}\n\n---\n\n#### BibTeX Entries\n${bibtexEntries}\n\n---\n\n#### Additional Details\n\n- **Has Successful Answer:** ${session?.has_successful_answer ? "Yes" : "No"}\n- **Cost:** ${session?.cost ?? 0}\n- **Token Counts:**\n    ${tokenCounts}\n- **Config MD5:** ${session?.config_md5 ?? ""}\n\n---\n\n#### Timing Information\n\n- **Agent Timing (${timingKey ?? ""}):**\n    - **Low:** ${timing?.low ?? 0} seconds\n    - **Mean:** ${timing?.mean ?? 0} seconds\n    - **Max:** ${timing?.max ?? 0} seconds\n    - **Total:** ${timing?.total ?? 0} seconds\n\n- **Overall Duration:** ${duration} seconds\n    `.trim();
};

/**
 * Executes a PaperQA task by calling the new Django endpoint.
 * For now, it simply puts the server's response in the output node's markdown field.
 */
export const executePaperQATask = async (
  task: Task,
  query: string,
  skillDoc: Y.Doc,
  nodesMap: Y.Map<CanvasNode>,
  outputNode: CanvasNode, // outputNode is the main skill output, not task output
  isLastTask: boolean
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");

    const response = await queryPaperQA(query);

    let markdown = "";
    try {
      markdown = paperQAResponseToMd(formatPaperQAResponse(response));
    } catch (error) {
      console.error("Error formatting PaperQA response", error);
      try {
        // Attempt to find answer in a known structure if formatting fails
        markdown = response[0][1].find((pair: PaperQAResponsePair) => pair[0] === "answer")?.[1];
      } catch (parseError) {
        console.error("Error parsing PaperQA response, stringifying full response", parseError);
        markdown = JSON.stringify(response, null, 2);
      }
    }

    const node: SingleNode = { title: "PaperQA Response: " + query, markdown: markdown };
    const sourceNode = findSourceNode(task);

    // Handle output for the task's specific output node
    if (task.outputNode?.id) {
      if (isMultipleResponseNode(task.outputNode)) {
        await addToSkillCanvas({
          canvasId: task.outputNode.id,
          document: skillDoc,
          nodes: [node],
          sourceNode,
        });
      } else {
        await setSkillNodeTitleAndContent(skillDoc, task.outputNode.id, node.title, node.markdown);
      }
    }

    // If it's the last task, also update the main skill output node
    if (isLastTask && outputNode?.id && outputNode.id !== task.outputNode?.id) {
      if (isMultipleResponseNode(outputNode)) {
        await addToSkillCanvas({
          canvasId: outputNode.id,
          document: skillDoc,
          nodes: [node],
          sourceNode,
        });
      } else {
        await setSkillNodeTitleAndContent(skillDoc, outputNode.id, node.title, node.markdown);
      }
    }

    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing PaperQA task", error);
    setNodesState(
      [task.promptNode.id],
      nodesMap,
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
};

export const executePaperQACollectionTask = async (
  task: Task,
  query: string,
  skillDoc: Y.Doc,
  nodesMap: Y.Map<CanvasNode>,
  outputNode: CanvasNode,
  isLastTask: boolean,
  authentication: string
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");

    if (!task.promptNode.data.paperQACollection) {
      throw Error("No PaperQA collection found in task, getting first");
    }

    const response = await queryPaperQACollection(
      task.promptNode.data.paperQACollection,
      query,
      authentication
    );

    let markdown = "";
    try {
      markdown = paperQAResponseToMd(formatPaperQAResponse(response));
    } catch (error) {
      console.error("Error formatting PaperQA response", error);
      try {
        markdown = response[0][1].find((pair: PaperQAResponsePair) => pair[0] === "answer")?.[1];
      } catch (parseError) {
        console.error("Error parsing PaperQA response, stringifying full response", parseError);
        markdown = JSON.stringify(response, null, 2);
      }
    }

    const node: SingleNode = { title: "PaperQA Collection Response: " + query, markdown: markdown };
    const sourceNode = findSourceNode(task);

    // Handle output for the task's specific output node
    if (task.outputNode?.id) {
      if (isMultipleResponseNode(task.outputNode)) {
        await addToSkillCanvas({
          canvasId: task.outputNode.id,
          document: skillDoc,
          nodes: [node],
          sourceNode,
        });
      } else {
        await setSkillNodeTitleAndContent(skillDoc, task.outputNode.id, node.title, node.markdown);
      }
    }

    // If it's the last task, also update the main skill output node
    if (isLastTask && outputNode?.id && outputNode.id !== task.outputNode?.id) {
      if (isMultipleResponseNode(outputNode)) {
        await addToSkillCanvas({
          canvasId: outputNode.id,
          document: skillDoc,
          nodes: [node],
          sourceNode,
        });
      } else {
        await setSkillNodeTitleAndContent(skillDoc, outputNode.id, node.title, node.markdown);
      }
    }

    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing PaperQA Collection task", error);
    setNodesState(
      [task.promptNode.id],
      nodesMap,
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
};
