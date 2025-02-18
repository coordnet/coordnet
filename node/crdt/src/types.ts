import { z } from "zod";

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
