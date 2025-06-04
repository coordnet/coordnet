import { AllowedActionsSchema, Skill, SkillSchema, SubProfile } from "@coordnet/core";
import { JSONContent } from "@tiptap/core";
import { z } from "zod";

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
  Skill = "skill",
  SkillRun = "skillrun",
}

export interface ApiError {
  [key: string]: string[];
}

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

export type Space = z.infer<typeof SpaceSchema>;
export type Node = z.infer<typeof NodeSchema>;

export type SpaceNode = {
  id: string;
  title: string;
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

export type ProfileCardSubProfile = z.infer<typeof SubProfile>;

export const ProfileCardSchema = z.object({
  id: z.string().uuid(),
  space_profile: SubProfile.nullable(),
  author_profile: SubProfile.nullable(),
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
  members: z.array(SubProfile),
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

// Types for the canvas or editor parent which can be a node or a skill
export enum BackendEntityType {
  SKILL = "skill",
  SPACE = "space",
}

// export type BackendParent = {
//   id: string;
//   type: BackendEntityType;
//   data?: BackendNodeDetail | Skill | Space;
//   error: Error | null;
//   isLoading: boolean;
// };

export type BackendParent =
  | {
      id: string;
      type: BackendEntityType.SKILL;
      data?: Skill;
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

export const SkillUpdateFormSchema = SkillSchema.pick({
  title: true,
  description: true,
  text: true,
  is_public: true,
  buddy: true,
});
export type SkillUpdateForm = z.infer<typeof SkillUpdateFormSchema>;

export const SkillCreateFormSchema = SkillUpdateFormSchema.extend({
  authors: z.array(z.string()),
});
export type SkillCreateForm = z.infer<typeof SkillCreateFormSchema>;

export const SkillVersionSchema = SkillSchema.pick({
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
  buddy: true,
}).extend({
  method: z.string(),
  version: z.number(),
  method_data: z.record(z.string(), z.unknown()),
});
export type SkillVersion = z.infer<typeof SkillVersionSchema>;

export enum YDocScope {
  READ_ONLY = "readonly",
  READ_ONLY_WITH_INPUT = "readonly-input",
  READ_WRITE = "read-write",
}

export type SkillsRunnerInputType =
  | "text"
  | "pdf"
  | "doc"
  | "xls"
  | "ppt"
  | "html"
  | "csv"
  | "json"
  | "xml"
  | "epub"
  | "txt"
  | "md";

export interface SkillsRunnerInput {
  id: string;
  type: SkillsRunnerInputType;
  name: string;
  content: JSONContent;
  error?: string;
}
