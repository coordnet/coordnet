import { useContext } from "react";

import { EditorContext } from "./context";

/**
 * Hook for sharing an editor between components
 */
export default function useEditor() {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error(`useEditor must be used within a EditorProvider`);
  }

  return context;
}
