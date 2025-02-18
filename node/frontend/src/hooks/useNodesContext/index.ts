import { useContext } from "react";

import { NodesContext } from "./context";

/**
 * Hook for sharing nodes between components
 */
export default function useNodesContext() {
  const context = useContext(NodesContext);

  if (!context) {
    throw new Error(`useNodesContext must be used within a NodesContextProvider`);
  }

  return context;
}
