import { HocuspocusProvider } from "@hocuspocus/provider";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import { getNode } from "@/api";
import { CustomError } from "@/lib/utils";
import { GraphEdge, GraphNode } from "@/types";

import useUser from "../useUser";
import { NodeContext } from "./context";

/**
 * Provider for sharing node between components
 */
export function NodeProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const { token } = useUser();
  const [graphSynced, setGraphSynced] = useState<boolean>(false);
  const [graphConnected, setGraphConnected] = useState<boolean>(false);
  const [editorSynced, setEditorSynced] = useState<boolean>(false);
  const [editorConnected, setEditorConnected] = useState<boolean>(false);
  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());
  const [editorError, setEditorError] = useState<Error | undefined>();
  const [graphError, setGraphError] = useState<Error | undefined>();
  const [editorProvider, setEditorProvider] = useState<HocuspocusProvider | undefined>();

  const { data: node, isLoading } = useQuery({
    queryKey: ["node", id],
    queryFn: ({ signal }) => getNode(signal, id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });

  const editorYdoc = useMemo(
    () => (!id ? undefined : new Y.Doc({ guid: `node-editor-${id}` })),
    [id],
  );

  useEffect(() => {
    setEditorConnected(false);
    setEditorSynced(false);
    if (!id || !editorYdoc) return;
    const newProvider = new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: `node-editor-${id}`,
      document: editorYdoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setEditorError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Editor Websocket Authentication Failed",
            message: data.reason,
          }),
        );
      },
      onSynced() {
        setEditorSynced(true);
      },
      onStatus(data) {
        setEditorConnected(data.status == "connected");
      },
    });
    setEditorProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
  }, [id, editorYdoc]);

  const graphYdoc = useMemo(
    () => (!id ? undefined : new Y.Doc({ guid: `node-graph-${id}` })),
    [id],
  );

  useEffect(() => {
    setGraphConnected(false);
    setGraphSynced(false);
    if (!id || !graphYdoc) {
      return;
    }
    const newProvider = new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: `node-graph-${id}`,
      document: graphYdoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setGraphError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Canvas Websocket Authentication Failed",
            message: data.reason,
          }),
        );
      },
      onSynced() {
        setGraphSynced(true);
      },
      onStatus(data) {
        setGraphConnected(data.status == "connected");
      },
    });

    return () => {
      newProvider.destroy();
    };
  }, [id, graphYdoc]);

  const nodesMap = graphYdoc?.getMap<GraphNode>("nodes");
  const edgesMap = graphYdoc?.getMap<GraphEdge>("edges");

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

  const value = {
    id,
    node,
    isLoading,
    editorYdoc,
    editorProvider,
    graphYdoc,
    connected: editorConnected && graphConnected,
    synced: editorSynced && graphSynced,
    nodesMap,
    edgesMap,
    nodes,
    edges,
    nodesSelection,
    setNodesSelection,
    edgesSelection,
    setEdgesSelection,
    error: editorError || graphError,
    graphError,
    graphConnected,
    graphSynced,
    editorError,
    editorConnected,
    editorSynced,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}
