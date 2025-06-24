import React, { useState } from "react";

import { NodeSearchResult } from "@/types";

import { NodeCopyContext } from "./context";

interface NodeCopyProviderProps {
  children: React.ReactNode;
}

export const NodeCopyProvider = ({ children }: NodeCopyProviderProps) => {
  const [pendingCopyData, setPendingCopyData] = useState<{
    nodeIds: string[];
    includeEdges: boolean;
  } | null>(null);

  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [onNodeSelect, setOnNodeSelect] = useState<
    ((node: NodeSearchResult) => Promise<void>) | null
  >(null);

  return (
    <NodeCopyContext.Provider
      value={{
        pendingCopyData,
        setPendingCopyData,
        isNodeSelectorOpen,
        setIsNodeSelectorOpen,
        onNodeSelect,
        setOnNodeSelect,
      }}
    >
      {children}
    </NodeCopyContext.Provider>
  );
};
