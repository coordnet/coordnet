import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import { GraphEdge, GraphNode } from "@/types";

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

  const editorRoomName = `node-editor-${id}`;
  const editorYdoc = useMemo(() => new Y.Doc({ guid: editorRoomName }), [editorRoomName]);
  const editorProvider = useMemo(() => {
    if (!id) return;
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: editorRoomName,
      document: editorYdoc,
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
    if (!id) return;
    return new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: graphRoomName,
      document: graphYdoc,
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
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}
