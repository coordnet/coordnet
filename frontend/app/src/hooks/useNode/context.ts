import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

import { BackendNode, GraphEdge, GraphNode } from "@/types";

type NodeContextType = {
  id: string;
  node: BackendNode | undefined;
  isLoading: boolean;
  editorProvider: HocuspocusProvider | undefined;
  editorYdoc: Y.Doc;
  graphYdoc: Y.Doc;
  nodesMap: Y.Map<GraphNode>;
  edgesMap: Y.Map<GraphEdge>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodesSelection: Set<string>;
  edgesSelection: Set<string>;
  setNodesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEdgesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  error: Error | null;
  connected: boolean;
  synced: boolean;
  graphError: Error | null;
  graphConnected: boolean;
  graphSynced: boolean;
  editorError: Error | null;
  editorConnected: boolean;
  editorSynced: boolean;
};

/**
 * Context for sharing node between components
 */
export const NodeContext = createContext<NodeContextType | undefined>(undefined);
