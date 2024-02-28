import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

import { GraphEdge, GraphNode } from "@/types";

type NodeContextType = {
  connected: boolean;
  synced: boolean;
  editorProvider: HocuspocusProvider;
  editorYdoc: Y.Doc;
  graphYdoc: Y.Doc;
  edgesMap: Y.Map<GraphEdge>;
  nodesMap: Y.Map<GraphNode>;
};

/**
 * Context for sharing node between components
 */
export const NodeContext = createContext<NodeContextType | undefined>(undefined);
