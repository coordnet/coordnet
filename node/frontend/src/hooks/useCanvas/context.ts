import { CanvasEdge, CanvasNode } from "@coordnet/core";
import { createContext } from "react";
import * as Y from "yjs";

export type CanvasContextType = {
  id: string | undefined;
  nodesMap: Y.Map<CanvasNode> | undefined;
  edgesMap: Y.Map<CanvasEdge> | undefined;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  inputNodes: string[];
  nodesSelection: Set<string>;
  edgesSelection: Set<string>;
  setNodesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEdgesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  nodeFeatures: (id: string) => { hasCanvas: boolean; hasPage: boolean; tokens: number };
};

/**
 * Context for sharing canvas between components
 */
export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);
