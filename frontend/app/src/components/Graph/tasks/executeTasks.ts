import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as Y from "yjs";

import { Buddy, NodeType, SpaceNode } from "@/types";
import { getCanvasNodes, getNodePageContent, waitForNode } from "@/utils";

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

  const formatNode = async (nodeId: string) => {
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
      const content = await Promise.all(nodes.map((node) => formatNode(node.id)));
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
