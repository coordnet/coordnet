import { CeleryBroker } from "@prd-thanhnguyenhoang/celery.node/dist/kombu/brokers";
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

export interface AMQPBrokerWithChannel extends CeleryBroker {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: Promise<any>;
}
