import { useContext } from "react";

import { MethodContext } from "./context";

/**
 * Hook for sharing a method between components
 */
export default function useMethod() {
  const context = useContext(MethodContext);

  if (!context) {
    throw new Error(`useMethod must be used within a MethodProvider`);
  }

  return context;
}
