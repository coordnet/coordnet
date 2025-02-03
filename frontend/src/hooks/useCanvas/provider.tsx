import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";

import { getNode } from "@/api";
import { BackendEntityType, CanvasEdge, CanvasNode, NodeType } from "@/types";

import useYDoc from "../useYDoc";
import { CanvasContext } from "./context";

/**
 * Provider for sharing a canvas between components
 */
export function CanvasProvider({
  nodeId,
  spaceId,
  skillId,
  skillNodeId,
  children,
}: {
  nodeId?: string;
  spaceId?: string;
  skillId?: string;
  skillNodeId?: string;
  children: React.ReactNode;
}) {
  const {
    parent,
    canvas: { YDoc },
  } = useYDoc();

  const isSkill = parent.type === BackendEntityType.SKILL;

  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());

  const { data: node } = useQuery({
    queryKey: ["node", nodeId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getNode(signal, nodeId!),
    enabled: Boolean(nodeId && spaceId),
    refetchInterval: 5000,
  });

  const nodesKey = skillId ? `${skillNodeId ? skillNodeId : skillId}-canvas-nodes` : "nodes";
  const edgesKey = skillId ? `${skillNodeId ? skillNodeId : skillId}-canvas-edges` : "edges";
  const nodesMap = YDoc?.getMap<CanvasNode>(nodesKey);
  const edgesMap = YDoc?.getMap<CanvasEdge>(edgesKey);

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [inputNodes, setInputNodes] = useState<string[]>([]);

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

  useEffect(() => {
    if (isSkill) {
      // Find the input node
      const inputNode = nodes.find((node) => node.data.type === NodeType.Input);
      const inputEdges = edges.filter((edge) => edge.target === inputNode?.id);
      const inputNodes = inputEdges
        .map((edge) => nodes.find((node) => node.id === edge.source))
        .filter((node) => node !== undefined)
        .map((n) => n.id);
      setInputNodes(inputNodes);
    }
  }, [isSkill, edges, nodes]);

  const nodeFeatures = (id: string) => {
    if (parent.type === BackendEntityType.SPACE) {
      const backendNode = node?.subnodes.find((node) => node.id === id);
      const hasCanvas = backendNode?.has_subnodes ?? false;
      const hasPage = Boolean(backendNode?.text_token_count);
      const tokens = (backendNode?.text_token_count ?? 0) + (backendNode?.title_token_count ?? 0);
      return { hasCanvas, hasPage, tokens };
    }
    if (parent.type === BackendEntityType.SKILL) {
      const nodesMap = YDoc?.getMap<CanvasNode>(`${id}-canvas-nodes`);
      const nodeDocument = YDoc?.getXmlFragment(`${id}-document`);
      return {
        hasCanvas: Boolean(nodesMap?.size),
        hasPage: Boolean(nodeDocument?.length),
        tokens: 0,
      };
    }
    return { hasCanvas: false, hasPage: false, tokens: 0 };
  };

  const value = {
    id: nodeId ?? skillNodeId ?? skillId,
    nodesMap,
    edgesMap,
    nodes,
    edges,
    inputNodes,
    nodesSelection,
    setNodesSelection,
    edgesSelection,
    setEdgesSelection,
    nodeFeatures,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}
