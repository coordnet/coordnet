import { useContext } from "react";

import { ContextMenuContext } from "./context";

/**
 * Hook for context menu in the canvas
 */
export default function useContextMenu() {
  const context = useContext(ContextMenuContext);

  if (!context) {
    throw new Error(`useContextMenu must be used within a ContextMenuProvider`);
  }

  return context;
}
