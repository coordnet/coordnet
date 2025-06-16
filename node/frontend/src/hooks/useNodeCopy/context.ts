import React, { createContext } from "react";

import { NodeSearchResult } from "@/types";

type NodeCopyContextType = {
  pendingCopyData: {
    nodeIds: string[];
    includeEdges: boolean;
  } | null;
  setPendingCopyData: React.Dispatch<
    React.SetStateAction<{
      nodeIds: string[];
      includeEdges: boolean;
    } | null>
  >;
  isNodeSelectorOpen: boolean;
  setIsNodeSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onNodeSelect: ((node: NodeSearchResult) => Promise<void>) | null;
  setOnNodeSelect: React.Dispatch<
    React.SetStateAction<((node: NodeSearchResult) => Promise<void>) | null>
  >;
};

export const NodeCopyContext = createContext<NodeCopyContextType | undefined>(undefined);
