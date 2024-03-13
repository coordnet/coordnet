import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useMemo, useState } from "react";
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

  const value = {
    editorYdoc,
    editorProvider,
    graphYdoc,
    connected: editorConnected && graphConnected,
    synced: editorSynced && graphSynced,
    nodesMap,
    edgesMap,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}
