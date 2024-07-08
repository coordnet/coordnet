import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as Y from "yjs";

import { Buddy, SpaceNode } from "@/types";
import { getNodePageContent, waitForNode } from "@/utils";

import { Task } from "./types";

function formatName(input: string) {
  // Replace spaces with underscores
  let converted = input.replace(/\s+/g, "_");

  // Remove any characters that are not alphanumeric, underscore, or hyphen
  converted = converted.replace(/[^a-zA-Z0-9_-]/g, "");

  return converted.slice(0, 50);
}

export const generatePrompt = async (
  task: Task,
  buddy: Buddy,
  spaceNodesMap: Y.Map<SpaceNode>,
): Promise<ChatCompletionMessageParam[]> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buddy?.system_message },
  ];
  for await (const graphNode of task.inputNodes) {
    const spaceNode = spaceNodesMap?.get(graphNode.id);
    await waitForNode(graphNode.id);
    const nodePageContent = await getNodePageContent(graphNode?.id ?? "");
    const content: string[] = [];
    content.push("Title: " + spaceNode?.title);
    content.push("Content: " + nodePageContent);
    content.push("");
    messages.push({
      role: "user",
      content: content.join("/n"),
      name: formatName(spaceNode?.title ?? ""),
    });
  }
  const spaceNode = spaceNodesMap?.get(task.promptNode.id);
  messages.push({ role: "user", content: spaceNode?.title ?? "" });

  return messages;
};
