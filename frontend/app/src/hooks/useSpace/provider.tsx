import { HocuspocusProvider } from "@hocuspocus/provider";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import * as Y from "yjs";

import { getSpace, getSpaceNodes } from "@/api";
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

  const { data: space, error } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: ({ signal }) => getSpace(signal, spaceId),
    enabled: Boolean(spaceId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [breadcrumbs, setBreadcrumbs] = useLocalStorageState<string[]>(
    `coordnet:breadcrumbs-${spaceId}`,
    { defaultValue: [] },
  );

  const { data: backendNodes } = useQuery({
    queryKey: ["space", space?.id, "nodes"],
    queryFn: ({ signal }) => getSpaceNodes(signal, space?.id),
    enabled: Boolean(space),
    retry: false,
    initialData: [],
    refetchOnWindowFocus: false,
    refetchInterval: 1000,
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

  // useEffect(() => {
  //   if (connected && nodesMap && space && !space?.default_node?.public_id) {
  //     console.log("Space with no default page, so create it", space);
  //     const id = uuid();
  //     nodesMap.set(id, { id, title: "Home" });
  //     // TODO: set default_node on space
  //   }
  // }, [space, nodesMap, connected]);

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
    space: space,
    spaceError: error,
    nodes,
    nodesMap,
    deletedNodes,
    synced,
    connected,
    provider,
    backendNodes: backendNodes ?? [],
    breadcrumbs,
    setBreadcrumbs,
  };

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
};
