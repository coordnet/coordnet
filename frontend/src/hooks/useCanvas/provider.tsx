import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";

import { getNode } from "@/api";
import { BackendEntityType, GraphEdge, GraphNode } from "@/types";

import useYDoc from "../useYDoc";
import { CanvasContext } from "./context";

/**
 * Provider for sharing a canvas between components
 */
export function CanvasProvider({
  nodeId,
  spaceId,
  methodId,
  methodNodeId,
  children,
}: {
  nodeId?: string;
  spaceId?: string;
  methodId?: string;
  methodNodeId?: string;
  children: React.ReactNode;
}) {
  const {
    parent,
    canvas: { YDoc, connected, synced, error },
  } = useYDoc();

  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());

  const { data: node } = useQuery({
    queryKey: ["node", nodeId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getNode(signal, nodeId!),
    enabled: Boolean(nodeId && spaceId),
    refetchInterval: 5000,
  });

  const nodesKey = methodId ? `${methodNodeId ? methodNodeId : methodId}-canvas-nodes` : "nodes";
  const edgesKey = methodId ? `${methodNodeId ? methodNodeId : methodId}-canvas-edges` : "edges";
  const nodesMap = YDoc?.getMap<GraphNode>(nodesKey);
  const edgesMap = YDoc?.getMap<GraphEdge>(edgesKey);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  useEffect(() => {
    if (!nodesMap) return;

    const observer = () => {
      const nodesArr = Array.from(nodesMap.values());
      nodesArr.forEach((node) => {
        node.selected = nodesSelection.has(node.id);
      });
      setNodes(nodesArr);
    };
    observer();
    nodesMap.observe(observer);
    return () => nodesMap.unobserve(observer);
  }, [nodesMap, setNodes, nodesSelection]);

  useEffect(() => {
    if (!edgesMap) return;

    const observer = () => {
      const edgesArr = Array.from(edgesMap.values());
      edgesArr.forEach((edge) => {
        edge.selected = edgesSelection.has(edge.id);
      });
      setEdges(edgesArr);
    };
    observer();
    edgesMap.observe(observer);
    return () => edgesMap.unobserve(observer);
  }, [edgesMap, setEdges, edgesSelection]);

  const nodeFeatures = (id: string) => {
    if (parent.type === BackendEntityType.SPACE) {
      const backendNode = node?.subnodes.find((node) => node.id === id);
      const hasGraph = backendNode?.has_subnodes ?? false;
      const hasPage = Boolean(backendNode?.text_token_count);
      const tokens = (backendNode?.text_token_count ?? 0) + (backendNode?.title_token_count ?? 0);
      return { hasGraph, hasPage, tokens };
    }
    if (parent.type === BackendEntityType.METHOD) {
      const nodesMap = YDoc?.getMap<GraphNode>(`${id}-canvas-nodes`);
      const nodeDocument = YDoc?.getXmlFragment(`${id}-document`);
      return {
        hasGraph: Boolean(nodesMap?.size),
        hasPage: Boolean(nodeDocument?.length),
        tokens: 0,
      };
    }
    return { hasGraph: false, hasPage: false, tokens: 0 };
  };

  const value = {
    id: nodeId ?? methodNodeId ?? methodId,
    parent,
    YDoc,
    nodesMap,
    edgesMap,
    nodes,
    edges,
    nodesSelection,
    setNodesSelection,
    edgesSelection,
    setEdgesSelection,
    error,
    connected,
    synced,
    nodeFeatures,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}
