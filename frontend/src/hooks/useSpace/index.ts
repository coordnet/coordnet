import { useContext } from "react";

import { SpaceContext } from "./context";

/**
 * Hook for sharing editor between components
 */
export default function useSpace() {
  const context = useContext(SpaceContext);

  if (!context) {
    throw new Error(`useSpace must be used within a SpaceProvider`);
  }

  return context;
}
