import * as Y from "yjs";

import { CanvasNode, PaperQAResponse, PaperQAResponsePair, Task } from "../types";
import { queryPaperQA } from "./api";
import { setNodesState, setSkillNodeTitleAndContent } from "./utils";

export const formatPaperQAResponse = (data: unknown): PaperQAResponse => {
  if (
    Array.isArray(data) &&
    data.every((item) => Array.isArray(item) && item.length === 2 && typeof item[0] === "string")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {};
    for (const [key, value] of data) {
      // Recurse on the value, in case it is itself an array of pairs
      obj[key] = formatPaperQAResponse(value);
    }
    return obj as PaperQAResponse;
  }
  throw new Error("Invalid PaperQA response format");
};

export const paperQAResponseToMd = (data: PaperQAResponse): string => {
  const session = data?.session;
  const bibtex = data?.bibtex;
  const timing_info = data?.timing_info;
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
    } catch {
      try {
        markdown = response[0][1].find((pair: PaperQAResponsePair) => pair[0] === "answer")?.[1];
      } catch {
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
