import { HocuspocusProvider } from "@hocuspocus/provider";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Y from "yjs";

import { getNode } from "@/api";
import { addMethodRunToYdoc, loadDisconnectedDoc } from "@/components/Methods/utils";
import { crdtUrl } from "@/constants";
import { CustomError } from "@/lib/utils";
import { BackendEntityType, GraphEdge, GraphNode } from "@/types";

import useBackendParent from "../useBackendParent";
import useUser from "../useUser";
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
  const { token } = useUser();
  const { runId } = useParams();
  const parent = useBackendParent(methodId, spaceId);

  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | undefined>();

  const { data: node } = useQuery({
    queryKey: ["node", nodeId],
    queryFn: ({ signal }: { signal: AbortSignal }) => getNode(signal, nodeId!),
    enabled: Boolean(nodeId && spaceId),
    refetchInterval: 5000,
  });

  const name = nodeId ? `node-graph-${nodeId}` : `method-${methodId}`;
  const document = useMemo(() => new Y.Doc({ guid: name }), [name]);

  const loadMethod = useCallback(
    async (runId: string) => {
      try {
        if (runId === "new") {
          await loadDisconnectedDoc(name, token, document);
        } else {
          await addMethodRunToYdoc(runId, document);
        }
        setSynced(true);
        setConnected(true);
      } catch (error) {
        toast.error("Failed to load the document");
        console.error("Failed to load the document:", error);
      }
    },
    [document, name, token]
  );

  useEffect(() => {
    if (!spaceId && !methodId) return;
    if (runId) {
      loadMethod(runId);
      return;
    }
    const newProvider = new HocuspocusProvider({
      url: crdtUrl,
      name,
      document,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Canvas Websocket Authentication Failed",
            message: data.reason,
          })
        );
      },
      onSynced() {
        setSynced(true);
      },
      onStatus(data) {
        setConnected(data.status == "connected");
      },
    });

    return () => {
      newProvider.destroy();
    };
  }, [nodeId, methodId, document, runId]);

  const nodesKey = methodId ? `${methodNodeId ? methodNodeId : methodId}-canvas-nodes` : "nodes";
  const edgesKey = methodId ? `${methodNodeId ? methodNodeId : methodId}-canvas-edges` : "edges";
  const nodesMap = document?.getMap<GraphNode>(nodesKey);
  const edgesMap = document?.getMap<GraphEdge>(edgesKey);

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
      const nodesMap = document?.getMap<GraphNode>(`${id}-canvas-nodes`);
      const nodeDocument = document?.getXmlFragment(`${id}-document`);
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
    document,
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
