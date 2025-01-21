import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

import { BackendParent, SpaceNode } from "@/types";

type NodesContextType = {
  parent: BackendParent;
  // space: Space | undefined;
  // spaceLoading: boolean;
  YDoc: Y.Doc | undefined;
  error: Error | undefined;
  nodesMap: Y.Map<SpaceNode> | undefined;
  nodes: SpaceNode[];
  synced: boolean;
  connected: boolean;
  provider: HocuspocusProvider | undefined;
  breadcrumbs: string[];
  setBreadcrumbs: React.Dispatch<React.SetStateAction<string[]>>;
  scope: string | undefined;
};

/**
 * Context for sharing nodes between components
 */
export const NodesContext = createContext<NodesContextType | undefined>(undefined);
