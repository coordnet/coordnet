import { createContext } from "react";
import * as Y from "yjs";

import { BackendNodeDetail, GraphEdge, GraphNode } from "@/types";

export type MethodContextType = {
  id: string;
  method: BackendNodeDetail | undefined;
  isLoading: boolean;
  // editorProvider: HocuspocusProvider | undefined;
  // editorYdoc: Y.Doc | undefined;
  // graphYdoc: Y.Doc | undefined;
  nodesMap: Y.Map<GraphNode> | undefined;
  edgesMap: Y.Map<GraphEdge> | undefined;
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodesSelection: Set<string>;
  edgesSelection: Set<string>;
  setNodesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEdgesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  error: Error | undefined;
  connected: boolean;
  synced: boolean;
  // errror: Error | undefined;
  // graphConnected: boolean;
  // graphSynced: boolean;
  // editorError: Error | undefined;
  // editorConnected: boolean;
  // editorSynced: boolean;
};

/**
 * Context for sharing a method between components
 */
export const MethodContext = createContext<MethodContextType | undefined>(undefined);
