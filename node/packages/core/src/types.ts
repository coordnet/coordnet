import { CompletionMeta } from "@instructor-ai/instructor";
import { JSONContent } from "@tiptap/core";
import { Edge, Node as XYFlowNode, Position } from "@xyflow/react";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { z } from "zod";

export enum NodeType {
  Default = "default",
  Loop = "loop",
  Input = "input",
  Output = "output",
  Prompt = "prompt",
  ResponseCombined = "response_combined",
  ResponseSingle = "response_single",
  ResponseMultiple = "response_multiple",
  ResponseTable = "response_table",
  ResponseMarkMap = "response_markmap",
  PaperFinder = "paper_finder",
  PaperQA = "paper_qa",
  PaperQACollection = "paper_qa_collection",
  ExternalData = "external_data",
}

export const nodeTypeMap = {
  [NodeType.Default]: "Default",
  [NodeType.Loop]: "Loop",
  [NodeType.Input]: "Input",
  [NodeType.Output]: "Output",
  [NodeType.Prompt]: "Prompt",
  [NodeType.ResponseCombined]: "Response (combined)",
  [NodeType.ResponseTable]: "Response (table)",
  [NodeType.ResponseSingle]: "Responses (one node)",
  [NodeType.ResponseMultiple]: "Responses (many nodes)",
  [NodeType.ResponseMarkMap]: "Responses (MarkMap)",
  [NodeType.PaperFinder]: "Paper Finder",
  [NodeType.PaperQA]: "FH API",
  [NodeType.PaperQACollection]: "Paper QA Collection",
  [NodeType.ExternalData]: "External Data",
};

export type SpaceNode = {
  id: string;
  title: string;
};

export type SourceNode = {
  id: string;
  spaceId?: string;
  nodeId?: string;
};

export type CanvasNode = XYFlowNode<
  {
    borderColor?: string;
    type?: NodeType;
    toolbarPosition?: Position;
    forceToolbarVisible?: boolean;
    syncing?: boolean;
    progress?: number;
    editing?: boolean;
    state?: string;
    error?: string;
    loading?: boolean;
    buddy?: Buddy;
    paperQACollection?: string;
    externalNode?: {
      nodeId: string;
      spaceId: string;
      depth: number;
    };
    sourceNode?: SourceNode;
  },
  "GraphNode" | "ExternalNode"
>;
export type CanvasEdge = Edge;

export interface Canvas {
  nodes: { [id: string]: CanvasNode };
  edges: { [id: string]: CanvasEdge };
  adjacencyList: { [id: string]: string[] };
  topologicallySortedNodes: string[];
}

export type ExportNodeSingle = {
  id: string;
  width: number | null | undefined;
  height: number | null | undefined;
  type?: string;
  title: string;
  position: {
    x: number;
    y: number;
  };
  data?: {
    borderColor?: string;
    type?: NodeType;
  };
  content?: JSONContent;
};

export type ExportNode = ExportNodeSingle & {
  nodes: ExportNodeSingle[];
  edges: CanvasEdge[];
};

export interface Task {
  inputNodes: CanvasNode[];
  outputNode: CanvasNode | null;
  promptNode: CanvasNode;
  loop?: boolean;
  sourceNodeInfo?: SourceNode;
}

export interface ExecutionContext {
  authentication: string;
  taskList: Task[];
  responses: { [nodeId: string]: string };
  outputNode: CanvasNode;
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
    type: "PROMPT" | "PAPERS" | "PAPERQA";
  }[];
};

export const AllowedActionsSchema = z.enum(["read", "write", "delete", "manage"]);
export type AllowedActions = z.infer<typeof AllowedActionsSchema>;

export const SubProfile = z.object({
  id: z.string().uuid(),
  profile_image: z.union([z.null(), z.string().url()]),
  profile_image_2x: z.union([z.null(), z.string().url()]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  profile_slug: z
    .string()
    .min(1, "Username is required")
    .max(255, "Username must be less than 255 characters")
    .regex(/^[a-z0-9]+$/, "Username must be alphanumeric"),
  title: z.string().min(1, "Name is required"),
  space: z.union([z.string().uuid(), z.null()]),
  user: z.union([z.string().uuid(), z.null()]),
});

export const SkillVersionSchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  title: z.string(),
  title_token_count: z.null(),
  description: z.string(),
  description_token_count: z.null(),
  content: z.null(),
  text: z.string().nullish(),
  text_token_count: z.null(),
  creator: SubProfile.nullable(),
  space: z.null(),
  authors: z.array(SubProfile),
  buddy: z.string(),
  run_count: z.number(),
  method: z.string(),
  version: z.number(),
  method_data: z.record(z.string(), z.unknown()),
});
export type SkillVersion = z.infer<typeof SkillVersionSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  title: z.string().min(1, "Skill name is required"),
  title_token_count: z.null(),
  description: z
    .string()
    .min(1, "Skill description is required")
    .max(255, "Skill description must be less than 100 characters"),
  description_token_count: z.null(),
  content: z.null(),
  text: z.string().nullish(),
  text_token_count: z.null(),
  image: z.union([z.null(), z.string().url()]),
  image_2x: z.union([z.null(), z.string().url()]),
  image_thumbnail: z.union([z.null(), z.string().url()]),
  image_thumbnail_2x: z.union([z.null(), z.string().url()]),
  node_type: z.string(),
  search_vector: z.null(),
  is_public: z.boolean(),
  is_public_writable: z.boolean(),
  creator: SubProfile.nullable(),
  space: z.null(),
  editor_document: z.null(),
  graph_document: z.null(),
  subnodes: z.array(z.any()),
  authors: z.array(SubProfile),
  allowed_actions: z.array(AllowedActionsSchema),
  latest_version: z.object({
    version: z.number(),
    id: z.string(),
  }),
  buddy: z.string(),
  run_count: z.number(),
  forked_from: SkillVersionSchema.nullable(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const BuddySchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
  name: z.string().min(2).max(255),
  model: z.string().min(2),
  system_message: z.string().min(2).max(10000),
  description: z.string().min(1),
});

export type Buddy = z.infer<typeof BuddySchema>;

export interface SemanticScholarPaper {
  title: string;
  year: number;
  referenceCount: number;
  citationCount: number;
  authors: Array<{ name: string }>;
  url: string;
  abstract: string;
  isOpenAccess: boolean;
}

export type RunStatus =
  | "loading"
  | "idle"
  | "pending"
  | "running"
  | "canceled"
  | "success"
  | "error";

export interface RunResult {
  status: RunStatus;
  error?: unknown;
}

export const SkillRunSchema = z.object({
  id: z.string(),
  space: z.null(),
  method: z.string(),
  method_version: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  method_data: z.record(z.string(), z.unknown()),
  is_dev_run: z.boolean(),
});
export type SkillRun = z.infer<typeof SkillRunSchema>;

export type SkillJson = { [key: string]: unknown };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PaperQAResponsePair = [string, any];

export interface PaperQAResponse {
  session: {
    id: string;
    question: string;
    answer: string;
    has_successful_answer: boolean;
    references: string;
    formatted_answer: string;
    graded_answer: null;
    cost: number;
    token_counts: { [key: string]: number[] };
    config_md5: string;
    tool_history: Array<string[]>;
  };
  usage: { [key: string]: number[] };
  bibtex: { [key: string]: string };
  status: string;
  timing_info: {
    [key: string]: {
      low: number;
      mean: number;
      max: number;
      total: number;
    };
  };
  duration: number;
}
