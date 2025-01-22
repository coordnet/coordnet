import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useSessionStorageState from "use-session-storage-state";
import { v4 as uuid } from "uuid";

import { updateSpace } from "@/api";
import { waitForNode } from "@/lib/nodes";
import { BackendEntityType, Space, SpaceNode } from "@/types";

import useYDoc from "../useYDoc";
import { NodesContext } from "./context";

/**
 * Provider for sharing space between components
 */
export const NodesContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { spaceId, skillId } = useParams();
  const queryClient = useQueryClient();

  const {
    parent,
    space: { YDoc, connected, provider, synced, error },
  } = useYDoc();

  const [nodes, setNodes] = useState<SpaceNode[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useSessionStorageState<string[]>(
    `coordnet:breadcrumbs-${spaceId ?? skillId}`,
    { defaultValue: [] }
  );

  useEffect(() => {
    console.log("space document changed", YDoc);
  }, [YDoc]);

  const nodesMap = YDoc?.getMap<SpaceNode>("nodes");

  // Update the space with a default node if it doesn't have one
  const updateSpaceDefaultNode = async (space: Space) => {
    const id = uuid();
    nodesMap?.set(id, { id, title: space.title ?? "Default Node" });

    // Wait for node to appear in backend
    await waitForNode(id);

    // Update the space with the default node and clear queries
    await updateSpace(space.id, { default_node: id });
    queryClient.invalidateQueries({ queryKey: ["spaces", spaceId] });
    queryClient.invalidateQueries({ queryKey: ["spaces", spaceId, "nodes"] });
  };

  // If the parent is a Space and there is no default node, create one
  useEffect(() => {
    if (
      connected &&
      nodesMap &&
      parent.type === BackendEntityType.SPACE &&
      parent.data &&
      !parent.data?.default_node
    ) {
      updateSpaceDefaultNode(parent.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.data, nodesMap, connected]);

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
    parent,
    YDoc,
    error,
    nodes,
    nodesMap,
    synced,
    connected,
    provider,
    breadcrumbs,
    setBreadcrumbs,
    scope: provider ? provider?.authorizedScope : "readonly",
  };

  return <NodesContext.Provider value={value}>{children}</NodesContext.Provider>;
};
