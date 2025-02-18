import { useContext } from "react";

import { QuickViewContext } from "./context";

/**
 * Hook for sharing editor between components
 */
export default function useQuickView() {
  const context = useContext(QuickViewContext);

  if (!context) {
    throw new Error(`useQuickView must be used within a QuickViewProvider`);
  }

  return context;
}
