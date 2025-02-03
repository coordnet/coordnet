import { useContext } from "react";

import { YDocContext } from "./context";

/**
 * Hook for sharing Y.Docs between components
 */
export default function useYDoc() {
  const context = useContext(YDocContext);

  if (!context) {
    throw new Error(`useYDoc must be used within a YDocProvider`);
  }

  return context;
}
