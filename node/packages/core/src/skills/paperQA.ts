import * as Y from "yjs";

import {
  CanvasNode,
  FutureHouseResponse,
  PaperQAResponse,
  PaperQAResponsePair,
  SingleNode,
  Task,
} from "../types";
import { queryPaperQA, queryPaperQACollection, queryFutureHouse } from "./api";
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

  return `**Question:** ${session?.question ?? ""}

#### Answer
${session?.answer ?? ""}

---

#### References
${session?.references ?? ""}

---

#### BibTeX Entries
${bibtexEntries}

---

#### Additional Details

- **Has Successful Answer:** ${session?.has_successful_answer ? "Yes" : "No"}
- **Cost:** ${session?.cost ?? 0}
- **Token Counts:**
    ${tokenCounts}
- **Config MD5:** ${session?.config_md5 ?? ""}

---

#### Timing Information

- **Agent Timing (${timingKey ?? ""}):**
    - **Low:** ${timing?.low ?? 0} seconds
    - **Mean:** ${timing?.mean ?? 0} seconds
    - **Max:** ${timing?.max ?? 0} seconds
    - **Total:** ${timing?.total ?? 0} seconds

- **Overall Duration:** ${duration} seconds
    `.trim();
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
  outputNode: CanvasNode,
  isLastTask: boolean
) => {
  try {
    setNodesState([task.promptNode.id], nodesMap, "executing");

    // Check if FutureHouse agent is specified
    const futureHouseAgent = task.promptNode.data.futureHouseAgent;
    let response: FutureHouseResponse | PaperQAResponsePair[];

    if (futureHouseAgent) {
      // Use FutureHouse API
      response = await queryFutureHouse(query, futureHouseAgent);
    } else {
      // Use traditional PaperQA API
      response = await queryPaperQA(query);
    }

    let markdown = "";

    if (futureHouseAgent) {
      // Handle FutureHouse response format
      try {
        // We know this is a FutureHouseResponse when futureHouseAgent is specified
        const futureHouseResponse = response as FutureHouseResponse;
        if (typeof futureHouseResponse === "object" && futureHouseResponse.answer) {
          markdown = futureHouseResponse.answer;
          if (futureHouseResponse.sources && futureHouseResponse.sources.length > 0) {
            markdown += "\n\n## Sources\n";
            futureHouseResponse.sources.forEach((source: string, index: number) => {
              markdown += `${index + 1}. ${source}\n`;
            });
          }
        } else {
          markdown = JSON.stringify(futureHouseResponse, null, 2);
        }
      } catch (error) {
        console.error("Error formatting FutureHouse response", error);
        markdown = JSON.stringify(response, null, 2);
      }
    } else {
      // Handle traditional PaperQA response format
      try {
        const paperQAResponse = response as PaperQAResponsePair[];
        markdown = paperQAResponseToMd(formatPaperQAResponse(paperQAResponse));
      } catch (error) {
        console.error("Error formatting PaperQA response", error);
        try {
          const paperQAResponse = response as PaperQAResponsePair[];
          markdown = paperQAResponse[0][1].find(
            (pair: PaperQAResponsePair) => pair[0] === "answer"
          )?.[1];
        } catch (error) {
          console.error("Error parsing PaperQA response", error);
          markdown = JSON.stringify(response, null, 2);
        }
      }
    }

    const serviceTitle = futureHouseAgent ? `FutureHouse (${futureHouseAgent})` : "PaperQA";
    const node: SingleNode = { title: `${serviceTitle} Response: ${query}`, markdown: markdown };

    const sourceNode = findSourceNode(task);

    const canvasIds = [task?.outputNode?.id, isLastTask ? outputNode.id : null]
      .filter((id): id is string => Boolean(id))
      .filter((id, index, arr) => arr.indexOf(id) === index);

    for (const canvasId of canvasIds) {
      // If it's a multiple response node
      if (task.outputNode && isMultipleResponseNode(task.outputNode)) {
        await addToSkillCanvas({ canvasId, document: skillDoc, nodes: [node], sourceNode });
      } else {
        // Otherwise just update the node directly
        await setSkillNodeTitleAndContent(skillDoc, canvasId, node.title, node.markdown);
      }
    }

    // Mark the node as done/inactive
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing PaperQA task", error);
    setNodesState(
      [task.promptNode.id],
      nodesMap,
      "error",
      `PaperQA error: ${(error as Error)?.message}`
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
      } catch (error) {
        console.error("Error parsing PaperQA response", error);
        markdown = JSON.stringify(response, null, 2);
      }
    }

    const node: SingleNode = { title: "PaperQA Response: " + query, markdown: markdown };

    const sourceNode = findSourceNode(task);

    const canvasIds = [task?.outputNode?.id, isLastTask ? outputNode.id : null]
      .filter((id): id is string => Boolean(id))
      .filter((id, index, arr) => arr.indexOf(id) === index);

    for (const canvasId of canvasIds) {
      // If it's a multiple response node
      if (task.outputNode && isMultipleResponseNode(task.outputNode)) {
        await addToSkillCanvas({ canvasId, document: skillDoc, nodes: [node], sourceNode });
      } else {
        // Otherwise just update the node directly
        await setSkillNodeTitleAndContent(skillDoc, canvasId, node.title, node.markdown);
      }
    }

    // Mark the node as done/inactive
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing PaperQA task", error);
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  }
};
