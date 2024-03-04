import { useCallback, useState } from "react";

import { QuickViewContext } from "./context";

/**
 * Provider for controlling quick view
 */
export const QuickViewProvider = ({ children }: { children: React.ReactNode }) => {
  const [isQuickViewOpen, setQuickViewOpen] = useState(false);
  const [nodeId, setNodeId] = useState<string>("");

  const showQuickView = useCallback((id: string) => {
    setNodeId(id);
    setQuickViewOpen(true);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewOpen(false);
    setNodeId("");
  }, []);

  const value = { isQuickViewOpen, nodeId, showQuickView, closeQuickView };

  return <QuickViewContext.Provider value={value}>{children}</QuickViewContext.Provider>;
};
