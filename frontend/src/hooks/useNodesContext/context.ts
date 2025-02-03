import { createContext } from "react";
import * as Y from "yjs";

import { SpaceNode } from "@/types";

type NodesContextType = {
  nodesMap: Y.Map<SpaceNode> | undefined;
  nodes: SpaceNode[];
  breadcrumbs: string[];
  setBreadcrumbs: React.Dispatch<React.SetStateAction<string[]>>;
};

/**
 * Context for sharing nodes between components
 */
export const NodesContext = createContext<NodesContextType | undefined>(undefined);
