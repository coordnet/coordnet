import { HocuspocusProvider } from "@hocuspocus/provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useSessionStorageState from "use-session-storage-state";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";

import { getSpace, updateSpace } from "@/api";
import { SpaceNode } from "@/types";
import { CustomError, waitForNode } from "@/utils";

import useUser from "../useUser";
import { SpaceContext } from "./context";

/**
 * Provider for sharing space between components
 */
export const SpaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { spaceId } = useParams();
  const { token } = useUser();
  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [nodes, setNodes] = useState<SpaceNode[]>([]);
  const queryClient = useQueryClient();
  const [spaceError, setSpaceError] = useState<Error | undefined>();
  const [provider, setProvider] = useState<HocuspocusProvider | undefined>();

  const {
    data: space,
    error,
    isLoading: spaceLoading,
  } = useQuery({
    queryKey: ["spaces", spaceId],
    queryFn: ({ signal }) => getSpace(signal, spaceId),
    enabled: Boolean(spaceId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) setSpaceError(error);
  }, [error]);

  const [breadcrumbs, setBreadcrumbs] = useSessionStorageState<string[]>(
    `coordnet:breadcrumbs-${spaceId}`,
    { defaultValue: [] },
  );

  const ydoc = useMemo(
    () => (!space?.id ? undefined : new Y.Doc({ guid: `space-${space.id}` })),
    [space],
  );

  useEffect(() => {
    if (!spaceId || !ydoc) return;
    const newProvider = new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: `space-${spaceId}`,
      document: ydoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setSpaceError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Space Websocket Authentication Failed",
            message: data.reason,
          }),
        );
      },
      onSynced() {
        setSynced(true);
      },
      onStatus(data) {
        setConnected(data.status == "connected");
      },
    });
    setProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
  }, [spaceId, space, ydoc]);

  const nodesMap = ydoc?.getMap<SpaceNode>("nodes");
  const deletedNodes = ydoc?.getArray<string>("deletedNodes");

  // Update the space with a default node if it doesn't have one
  const updateSpaceDefaultNode = async (spaceId: string) => {
    const id = uuid();
    nodesMap?.set(id, { id, title: space?.title ?? "Default Node" });

    // Wait for node to appear in backend
    await waitForNode(id);

    // Update the space with the default node and clear queries
    await updateSpace(spaceId, { default_node: id });
    queryClient.invalidateQueries({ queryKey: ["spaces", spaceId] });
    queryClient.invalidateQueries({ queryKey: ["spaces", spaceId, "nodes"] });
  };

  // No default node, create one
  useEffect(() => {
    if (connected && nodesMap && space && !space?.default_node) {
      updateSpaceDefaultNode(space.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, nodesMap, connected]);

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
    spaceLoading,
    spaceError,
    nodes,
    nodesMap,
    deletedNodes,
    synced,
    connected,
    provider,
    breadcrumbs,
    setBreadcrumbs,
    scope: provider?.authorizedScope,
  };

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
};
