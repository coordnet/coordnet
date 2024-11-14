import { useContext } from "react";

import { CanvasContext } from "./context";

/**
 * Hook for sharing editor between components
 */
export default function useCanvas() {
  const context = useContext(CanvasContext);

  if (!context) {
    throw new Error(`useCanvas must be used within a CanvasProvider`);
  }

  return context;
}
