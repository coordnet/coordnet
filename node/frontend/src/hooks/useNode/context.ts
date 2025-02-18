import { createContext } from "react";

import { BackendNodeDetail } from "@/types";

export type NodeContextType = {
  id: string;
  node: BackendNodeDetail | undefined;
  isLoading: boolean;
};

/**
 * Context for sharing a node between components
 */
export const NodeContext = createContext<NodeContextType | undefined>(undefined);
