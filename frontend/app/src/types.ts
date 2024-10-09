import { JSONContent } from "@tiptap/core";
import { Edge, Node as ReactFlowNode } from "reactflow";
import { z } from "zod";

import { buddyModels } from "./constants";

// https://github.com/colinhacks/zod/discussions/839#discussioncomment-8142768
export const zodEnumFromObjKeys = <K extends string>(
  obj: Record<K, unknown>,
): z.ZodEnum<[K, ...K[]]> => {
  const [firstKey, ...otherKeys] = Object.keys(obj) as K[];
  return z.enum([firstKey, ...otherKeys]);
};

export interface Me {
  id: string;
  name: string;
  email: string;
}

export const PermissionSchema = z.object({
  id: z.string(),
  role: z.union([z.literal("owner"), z.literal("member"), z.literal("viewer")]),
  user: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Permission = z.infer<typeof PermissionSchema>;

export enum PermissionModel {
  Node = "node",
  Space = "space",
}

export interface ApiError {
  [key: string]: string[];
}

const AllowedActionsSchema = z.enum(["read", "write", "delete", "manage"]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NodeSchema = z.object({
  public_id: z.string(),
  title: z.string(),
  text_token_count: z.number().nullable(),
  title_token_count: z.number(),
  url: z.string(),
});

export const SpaceSchema = z.object({
  id: z.string(),
  title_slug: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  title: z.string(),
  default_node: z.string().nullable(),
  allowed_actions: z.array(AllowedActionsSchema),
  is_public: z.boolean(),
  is_public_writable: z.boolean(),
});

export type AllowedActions = z.infer<typeof AllowedActionsSchema>;
export type Space = z.infer<typeof SpaceSchema>;
export type Node = z.infer<typeof NodeSchema>;

export type SpaceNode = {
  id: string;
  title: string;
};

export type GraphNode = ReactFlowNode;
export type GraphEdge = Edge;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    type?: string;
  };
  content?: JSONContent;
};

export type ExportNode = ExportNodeSingle & {
  nodes: ExportNodeSingle[];
  edges: GraphEdge[];
};

export const BackendNodeSchema = z.object({
  id: z.string(),
  title_token_count: z.number(),
  text_token_count: z.number().nullable(),
  allowed_actions: z.array(z.string()),
  subnode_count: z.number(),
});

export type BackendNode = z.infer<typeof BackendNodeSchema>;

export const BackendNodeDetailSchema = BackendNodeSchema.extend({
  subnodes: z.array(z.lazy(() => BackendNodeSchema)),
});

export type BackendNodeDetail = z.infer<typeof BackendNodeDetailSchema>;

export const NodeSearchResultSchema = z.object({
  id: z.string(),
  spaces: z.array(z.string()),
  parents: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  title: z.string(),
  title_token_count: z.number(),
  text_token_count: z.number(),
});
export type NodeSearchResult = z.infer<typeof NodeSearchResultSchema>;

export const BuddySchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
  name: z.string().min(2).max(255),
  model: zodEnumFromObjKeys(buddyModels),
  system_message: z.string().min(2).max(10000),
  description: z.string().min(1),
});

export type Buddy = z.infer<typeof BuddySchema>;

export interface LLMTokenCount {
  [key: string]: number;
}

export interface PaginatedApiResponse<T> {
  count: number;
  next: string;
  previous: string | null;
  results: T[];
}

export interface NodeVersion {
  id: string;
  url: string;
  crdt: string;
  created_at: string;
  updated_at: string;
  document_type: "GRAPH" | "SPACE" | "EDITOR";
  document: string;
}

export enum NodeType {
  Default = "default",
  Loop = "loop",
  Output = "output",
  Prompt = "prompt",
  ResponseCombined = "response_combined",
  ResponseSingle = "response_single",
  ResponseMultiple = "response_multiple",
  ResponseTable = "response_table",
  PaperFinder = "paper_finder",
}

export const nodeTypeMap = {
  [NodeType.Default]: "Default",
  [NodeType.Loop]: "Loop",
  [NodeType.Output]: "Output",
  [NodeType.Prompt]: "Prompt",
  [NodeType.ResponseCombined]: "Response (combined)",
  [NodeType.ResponseTable]: "Response (table)",
  [NodeType.ResponseSingle]: "Responses (one node)",
  [NodeType.ResponseMultiple]: "Responses (many nodes)",
  [NodeType.PaperFinder]: "Paper Finder",
};

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
