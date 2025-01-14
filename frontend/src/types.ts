import { JSONContent } from "@tiptap/core";
import { Edge, Node as ReactFlowNode } from "reactflow";
import { z } from "zod";

import { Profile } from "./components";
import { buddyModels } from "./constants";

// https://github.com/colinhacks/zod/discussions/839#discussioncomment-8142768
export const zodEnumFromObjKeys = <K extends string>(
  obj: Record<K, unknown>
): z.ZodEnum<[K, ...K[]]> => {
  const [firstKey, ...otherKeys] = Object.keys(obj) as K[];
  return z.enum([firstKey, ...otherKeys]);
};

export interface Me {
  id: string;
  name: string;
  email: string;
  profile: string;
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
  Space = "space",
  Method = "method",
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
  node_count: z.number(),
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
  has_subnodes: z.boolean(),
});

export type BackendNode = z.infer<typeof BackendNodeSchema>;

export const BackendNodeDetailSchema = BackendNodeSchema.extend({
  subnodes: z.array(z.lazy(() => BackendNodeSchema)),
});

export type BackendNodeDetail = z.infer<typeof BackendNodeDetailSchema>;

export const NodeSearchResultSchema = z.object({
  id: z.string(),
  space: z.string(),
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
  Input = "input",
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
  [NodeType.Input]: "Input",
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

const ProfileCardSubProfileSchema = z.object({
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

export type ProfileCardSubProfile = z.infer<typeof ProfileCardSubProfileSchema>;

export const ProfileCardSchema = z.object({
  id: z.string().uuid(),
  space_profile: ProfileCardSubProfileSchema.nullable(),
  author_profile: ProfileCardSubProfileSchema.nullable(),
  created_by: z.string().uuid(),
  image: z.union([z.null(), z.string().url()]),
  image_2x: z.union([z.null(), z.string().url()]),
  image_thumbnail: z.union([z.null(), z.string().url()]),
  image_thumbnail_2x: z.union([z.null(), z.string().url()]),
  title: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status_message: z.string(),
  draft: z.boolean(),
  url: z.union([
    z.literal(""),
    z.string().regex(/^\/.*$/, {
      message: "URL must be a relative Coordination Network URL starting with /",
    }),
  ]),
  video_url: z.union([z.literal(""), z.string().url("Video must be a valid URL")]),
});

export type ProfileCard = z.infer<typeof ProfileCardSchema>;

export const ProfileCardFormSchema = ProfileCardSchema.pick({
  title: true,
  description: true,
  status_message: true,
  draft: true,
  url: true,
  video_url: true,
}).merge(
  z.object({
    author_profile: z.union([z.string().uuid(), z.null(), z.literal("")]),
    space_profile: z.union([z.string().uuid(), z.null(), z.literal("")]),
  })
);
export type ProfileCardForm = z.infer<typeof ProfileCardFormSchema>;

const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  space: z.union([z.string().uuid(), z.null()]),
  user: z.union([z.string().uuid(), z.null()]),
  cards: z.array(ProfileCardSchema),
  profile_image: z.union([z.null(), z.string().url()]),
  profile_image_2x: z.union([z.null(), z.string().url()]),
  banner_image: z.union([z.null(), z.string().url()]),
  banner_image_2x: z.union([z.null(), z.string().url()]),
  members: z.array(ProfileCardSubProfileSchema),
  object_created: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  profile_slug: z
    .string()
    .min(1, "Username is required")
    .max(255, "Username must be less than 255 characters")
    .regex(/^[a-z0-9-]+$/, "Username must be alphanumeric"),
  title: z.string().min(1, "Name is required"),
  description: z.union([z.null(), z.string(), z.literal("")]),
  draft: z.boolean(),
  website: z.union([z.null(), z.literal(""), z.string().url("Website must be a valid URL")]),
  telegram_url: z.union([z.null(), z.literal(""), z.string().url("Telegram must be a valid URL")]),
  bluesky_url: z.union([z.null(), z.literal(""), z.string().url("Bluesky must be a valid URL")]),
  twitter_url: z.union([z.null(), z.literal(""), z.string().url("X must be a valid URL")]),
  eth_address: z.union([
    z.null(),
    z.literal(""),
    z.string().regex(ethAddressRegex, {
      message: "Invalid Ethereum address format",
    }),
  ]),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileFormSchema = ProfileSchema.pick({
  title: true,
  profile_slug: true,
  description: true,
  draft: true,
  website: true,
  telegram_url: true,
  bluesky_url: true,
  twitter_url: true,
  eth_address: true,
}).extend({
  members: z.array(z.string().uuid()),
});
export type ProfileForm = z.infer<typeof ProfileFormSchema>;

// Types for the canvas or editor parent which can be a node or a method
export enum BackendEntityType {
  METHOD = "method",
  SPACE = "space",
}

// export type BackendParent = {
//   id: string;
//   type: BackendEntityType;
//   data?: BackendNodeDetail | Method | Space;
//   error: Error | null;
//   isLoading: boolean;
// };

export type BackendParent =
  | {
      id: string;
      type: BackendEntityType.METHOD;
      data?: Method;
      error: Error | null;
      isLoading: boolean;
    }
  | {
      id: string;
      type: BackendEntityType.SPACE;
      data?: Space;
      error: Error | null;
      isLoading: boolean;
    };

export const MethodSchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  title: z.string().min(1, "Method name is required"),
  title_token_count: z.null(),
  description: z
    .string()
    .min(1, "Short description is required")
    .max(255, "Short description must be less than 100 characters"),
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
  creator: z.string(),
  space: z.null(),
  editor_document: z.null(),
  graph_document: z.null(),
  subnodes: z.array(z.any()),
  authors: z.array(z.string()),
  allowed_actions: z.array(AllowedActionsSchema),
});
export type Method = z.infer<typeof MethodSchema>;

export const MethodUpdateFormSchema = MethodSchema.pick({
  title: true,
  description: true,
  text: true,
  is_public: true,
});
export type MethodUpdateForm = z.infer<typeof MethodUpdateFormSchema>;

export const MethodRunSchema = z.object({
  id: z.string(),
  space: z.null(),
  method: z.string(),
  method_version: z.null(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  method_data: z.record(z.string(), z.unknown()),
  is_dev_run: z.boolean(),
});
export type MethodRun = z.infer<typeof MethodRunSchema>;

export const MethodVersionSchema = MethodSchema.pick({
  id: true,
  created_at: true,
  updated_at: true,
  title: true,
  title_token_count: true,
  description: true,
  description_token_count: true,
  content: true,
  text: true,
  text_token_count: true,
  creator: true,
  space: true,
  authors: true,
}).extend({
  method: z.string(),
  version: z.number(),
});
export type MethodVersion = z.infer<typeof MethodVersionSchema>;
