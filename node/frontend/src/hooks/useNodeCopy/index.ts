import { useContext } from "react";

import { NodeCopyContext } from "./context";

export const useNodeCopy = () => {
  const context = useContext(NodeCopyContext);
  if (context === undefined) {
    throw new Error("useNodeCopy must be used within a NodeCopyProvider");
  }
  return context;
};
