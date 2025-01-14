import { useQuery } from "@tanstack/react-query";
import React from "react";

import { getNode } from "@/api";

import { NodeContext } from "./context";

/**
 * Provider for sharing a node between components
 */
export function NodeProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const { data: node, isLoading } = useQuery({
    queryKey: ["node", id],
    queryFn: ({ signal }) => getNode(signal, id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });

  const value = {
    id,
    node,
    isLoading,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}
