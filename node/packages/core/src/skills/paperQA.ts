import * as Y from "yjs";

import { CanvasNode, PaperQAResponse, PaperQAResponsePair, Task } from "../types";
import { queryPaperQA } from "./api";
import { setNodesState, setSkillNodeTitleAndContent } from "./utils";

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

    const response = await queryPaperQA(query);

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

    [task?.outputNode?.id, isLastTask ? outputNode.id : null].forEach(async (id) => {
      if (id) await setSkillNodeTitleAndContent(skillDoc, id, "PaperQA Response", markdown);
    });

    // Mark the node as done/inactive
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  } catch (error) {
    console.error("Error executing PaperQA task", error);
    setNodesState([task.promptNode.id], nodesMap, "inactive");
  }
};
