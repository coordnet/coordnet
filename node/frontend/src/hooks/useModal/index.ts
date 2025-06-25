import { useContext } from "react";

import { ModalContext } from "./context";

/**
 * Hook for managing global modal state
 */
export default function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error(`useModal must be used within a ModalProvider`);
  }

  return context;
}

// Re-export types for convenience
export { ModalType } from "./context";
export type { ModalData, ModalContextType, ModalState } from "./context";
export { ModalProvider } from "./provider";
