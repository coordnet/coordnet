import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

import { SpaceNode } from "@/types";

type SpaceContextType = {
  space: string | undefined;
  nodesMap: Y.Map<SpaceNode> | undefined;
  nodes: SpaceNode[];
  synced: boolean;
  connected: boolean;
  provider: HocuspocusProvider | undefined;
  deletedNodes: Y.Array<string> | undefined;
};

/**
 * Context for sharing space between components
 */
export const SpaceContext = createContext<SpaceContextType | undefined>(undefined);
