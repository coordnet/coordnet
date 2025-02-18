import { createContext } from "react";

type QuickViewContextType = {
  isQuickViewOpen: boolean;
  nodeId: string;
  showQuickView: (id: string) => void;
  closeQuickView: () => void;
};

/**
 * Context for sharing node between components
 */
export const QuickViewContext = createContext<QuickViewContextType | undefined>(undefined);
