import { createContext } from "react";
import * as Y from "yjs";

import { BackendParent, CanvasEdge, CanvasNode } from "@/types";

export type CanvasContextType = {
  id: string | undefined;
  parent: BackendParent;
  YDoc: Y.Doc | undefined;
  nodesMap: Y.Map<CanvasNode> | undefined;
  edgesMap: Y.Map<CanvasEdge> | undefined;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  nodesSelection: Set<string>;
  edgesSelection: Set<string>;
  setNodesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEdgesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  error: Error | undefined;
  connected: boolean;
  synced: boolean;
  nodeFeatures: (id: string) => { hasCanvas: boolean; hasPage: boolean; tokens: number };
};

/**
 * Context for sharing canvas between components
 */
export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);
