import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

import { getSpace } from "@/api";
import { SpaceNode } from "@/types";

import { SpaceContext } from "./context";

/**
 * Provider for sharing space between components
 */
export const SpaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { spaceId } = useParams();
  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [nodes, setNodes] = useState<SpaceNode[]>([]);

  const { data: space, isError } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: ({ signal }) => getSpace(signal, spaceId),
    enabled: Boolean(spaceId),
    retry: false,
  });

  const ydoc = useMemo(
    () => (space ? new Y.Doc({ guid: `space-${space.id}` }) : undefined),
    [space],
  );
  const provider = useMemo(() => {
    if (!space || !ydoc) return;
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: `space-${space.id}`,
      document: ydoc,
      onSynced() {
        setSynced(true);
      },
      onStatus(data) {
        setConnected(data.status == "connected");
      },
    });
  }, [space, ydoc]);

  const nodesMap = ydoc?.getMap<SpaceNode>("nodes");
  const deletedNodes = ydoc?.getArray<string>("deletedNodes");

  // Here we are observing the nodesMap and updating the nodes state whenever the map changes.
  useEffect(() => {
    if (!nodesMap) return;
    const observer = () => {
      setNodes(Array.from(nodesMap.values()));
    };

    setNodes(Array.from(nodesMap.values()));
    nodesMap.observe(observer);

    return () => nodesMap.unobserve(observer);
  }, [nodesMap, setNodes]);

  const value = {
    space,
    spaceError: isError,
    nodes,
    nodesMap,
    deletedNodes,
    synced,
    connected,
    provider,
  };

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
};
