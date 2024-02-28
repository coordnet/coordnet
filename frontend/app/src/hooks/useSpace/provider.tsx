import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

import { SpaceContext } from "./context";

/**
 * Provider for sharing space between components
 */
export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const { spaceId } = useParams();
  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);

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

  const nodes = ydoc?.getMap<Node>("nodes");

  const value = { space: spaceId, nodes, synced, connected, provider };

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}
