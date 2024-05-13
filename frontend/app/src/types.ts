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
  role: z.union([z.literal("Owner"), z.literal("Member"), z.literal("Viewer")]),
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

export interface BackendNode {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
  title: string;
  title_token_count: number;
  // content:           NodeContent | null;
  text: null | string;
  text_token_count: number | null;
  subnodes: string[];
  allowed_actions: AllowedActions[];
  is_public: boolean;
}

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
