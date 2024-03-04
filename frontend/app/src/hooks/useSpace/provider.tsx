import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

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

  const roomName = `space-${spaceId}`;
  const ydoc = useMemo(() => (roomName ? new Y.Doc({ guid: roomName }) : undefined), [roomName]);
  const provider = useMemo(() => {
    if (!roomName || !ydoc) return;
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: roomName,
      document: ydoc,
      onSynced() {
        setSynced(true);
      },
      onStatus(data) {
        setConnected(data.status == "connected");
      },
    });
  }, [roomName, ydoc]);

  const nodesMap = ydoc?.getMap<SpaceNode>("nodes");
  const deletedNodes = ydoc?.getArray<string>("deletedNodes");

  // here we are observing the nodesMap and updating the nodes state whenever the map changes.
  useEffect(() => {
    if (!nodesMap) return;
    const observer = () => {
      setNodes(Array.from(nodesMap.values()));
    };

    setNodes(Array.from(nodesMap.values()));
    nodesMap.observe(observer);

    return () => nodesMap.unobserve(observer);
  }, [setNodes]);

  const value = { space: spaceId, nodes, nodesMap, deletedNodes, synced, connected, provider };

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
};
