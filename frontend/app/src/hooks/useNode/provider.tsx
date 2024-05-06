import { HocuspocusProvider } from "@hocuspocus/provider";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import store from "store2";
import * as Y from "yjs";

import { getNode } from "@/api";
import { GraphEdge, GraphNode } from "@/types";
import { CustomError } from "@/utils";

import { NodeContext } from "./context";

/**
 * Provider for sharing node between components
 */
export function NodeProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const [graphSynced, setGraphSynced] = useState<boolean>(false);
  const [graphConnected, setGraphConnected] = useState<boolean>(false);
  const [editorSynced, setEditorSynced] = useState<boolean>(false);
  const [editorConnected, setEditorConnected] = useState<boolean>(false);
  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());
  const [editorError, setEditorError] = useState<Error | null>(null);
  const [graphError, setGraphError] = useState<Error | null>(null);

  const { data: node, isLoading } = useQuery({
    queryKey: ["node", id],
    queryFn: ({ signal }) => getNode(signal, id),
    enabled: Boolean(id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const editorRoomName = `node-editor-${id}`;
  const editorYdoc = useMemo(() => new Y.Doc({ guid: editorRoomName }), [editorRoomName]);
  const editorProvider = useMemo(() => {
    setEditorConnected(false);
    setEditorSynced(false);
    if (!id) return;
    const token = store("coordnet-auth");
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: editorRoomName,
      document: editorYdoc,
      token,
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
  }, [id, editorRoomName, editorYdoc]);

  const graphRoomName = `node-graph-${id}`;
  const graphYdoc = useMemo(() => new Y.Doc({ guid: graphRoomName }), [graphRoomName]);
  useMemo(() => {
    setGraphConnected(false);
    setGraphSynced(false);
    if (!id || !graphYdoc) return;
    const token = store("coordnet-auth");
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: graphRoomName,
      document: graphYdoc,
      token: token,
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
  }, [id, graphRoomName, graphYdoc]);

  const nodesMap = graphYdoc.getMap<GraphNode>("nodes");
  const edgesMap = graphYdoc.getMap<GraphEdge>("edges");

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
