import { useContext } from "react";

import { AlignmentContext } from "./context";

/**
 * Hook for sharing alignment settings between components
 */
export default function useAlignment() {
  const context = useContext(AlignmentContext);

  if (!context) {
    throw new Error(`useAlignment must be used within an AlignmentProvider`);
  }

  return context;
}
