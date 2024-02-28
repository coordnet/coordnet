import { useContext } from "react";

import { NodeContext } from "./context";

/**
 * Hook for sharing editor between components
 */
export default function useNode() {
  const context = useContext(NodeContext);

  if (!context) {
    throw new Error(`useNode must be used within a NodeProvider`);
  }

  return context;
}
