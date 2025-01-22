import { CompletionMeta } from "@instructor-ai/instructor";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { z } from "zod";

import { CanvasEdge, CanvasNode } from "@/types";

export interface Canvas {
  nodes: { [id: string]: CanvasNode };
  edges: { [id: string]: CanvasEdge };
  adjacencyList: { [id: string]: string[] };
  topologicallySortedNodes: string[];
}

export interface Task {
  inputNodes: CanvasNode[];
  outputNode: CanvasNode | null;
  promptNode: CanvasNode;
  loop?: boolean;
}

export interface ExecutionContext {
  taskList: Task[];
  responses: { [nodeId: string]: string };
}

export const SingleNodeSchema = z
  .object({
    title: z.string().describe("The title"),
    markdown: z.string().describe("The body with Markdown formatting"),
  })
  .describe("A list of nodes to be added to the canvas");

export type SingleNode = z.infer<typeof SingleNodeSchema>;

export type SingleNodeResponse = Partial<{ title: string; markdown: string }> & {
  _meta?: CompletionMeta | undefined;
};

export const MultipleNodesSchema = z.object({
  nodes: z.array(SingleNodeSchema),
});

export type MultipleNodesResponse = Partial<{ nodes: { title: string; markdown: string }[] }> & {
  _meta?: CompletionMeta | undefined;
};

export type TableRow<TSchema extends z.AnyZodObject> = z.infer<TSchema>;

export type TableResponse<TSchema extends z.AnyZodObject> = Partial<TableRow<TSchema>> & {
  _meta?: CompletionMeta | undefined;
};

export type ExecutionPlan = {
  tasks: {
    task: Task;
    messages?: ChatCompletionMessageParam[];
    query?: string;
    type: "PROMPT" | "PAPERS";
  }[];
};
