import { useContext } from "react";

import { FocusContext } from "./context";

/**
 * Hook for sharing editor between components
 */
export default function useFocus() {
  const context = useContext(FocusContext);

  if (!context) {
    throw new Error(`useFocus must be used within a FocusProvider`);
  }

  return context;
}
