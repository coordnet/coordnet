import { useNodeCopy } from "@/hooks";
import { NodeSearchResult } from "@/types";

import NodeRepository from "./NodeRepository";

const NodeRepositorySelector = () => {
  const { isNodeSelectorOpen, onNodeSelect, setIsNodeSelectorOpen } = useNodeCopy();

  if (!isNodeSelectorOpen) return null;

  const handleClose = () => {
    setIsNodeSelectorOpen(false);
  };

  const handleNodeSelect = async (node: NodeSearchResult) => {
    if (onNodeSelect) {
      await onNodeSelect(node);
    }
    setIsNodeSelectorOpen(false);
  };

  return (
    <NodeRepository selectionMode={true} onNodeSelect={handleNodeSelect} onClose={handleClose} />
  );
};

export default NodeRepositorySelector;
