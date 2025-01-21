import { createContext } from "react";
import * as Y from "yjs";

import { BackendParent, GraphEdge, GraphNode } from "@/types";

export type CanvasContextType = {
  id: string | undefined;
  parent: BackendParent;
  YDoc: Y.Doc | undefined;
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
  nodeFeatures: (id: string) => { hasGraph: boolean; hasPage: boolean; tokens: number };
};

/**
 * Context for sharing canvas between components
 */
export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);
