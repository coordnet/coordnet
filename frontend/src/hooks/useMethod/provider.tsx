import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import { crdtUrl } from "@/constants";
import { CustomError } from "@/lib/utils";
import { BackendNodeDetail, GraphEdge, GraphNode } from "@/types";

import useUser from "../useUser";
import { MethodContext } from "./context";

const method: BackendNodeDetail = {
  id: "ce23aab9-005f-4f88-b4e7-49ad1c45f088",
  title_token_count: 3,
  text_token_count: 519,
  has_subnodes: true,
  subnodes: [
    {
      id: "154e0cf3-88e9-478c-b750-fad789f4b711",
      title_token_count: 3,
      text_token_count: 11,
      has_subnodes: true,
    },
    {
      id: "d22e64c0-7406-483a-8b67-8e01295cbda7",
      title_token_count: 4,
      text_token_count: 0,
      has_subnodes: true,
    },
    {
      id: "dd1b0383-c505-41df-9205-2c885917484a",
      title_token_count: 2,
      text_token_count: 87,
      has_subnodes: false,
    },
    {
      id: "e150cc33-b40f-479a-ac19-87adb1c22ed3",
      title_token_count: 2,
      text_token_count: 212,
      has_subnodes: true,
    },
  ],
};

/**
 * Provider for sharing a method between components
 */
export function MethodProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const { token } = useUser();
  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>();

  // const [editorSynced, setEditorSynced] = useState<boolean>(false);
  // const [editorConnected, setEditorConnected] = useState<boolean>(false);
  const [nodesSelection, setNodesSelection] = useState<Set<string>>(new Set());
  const [edgesSelection, setEdgesSelection] = useState<Set<string>>(new Set());
  // const [editorError, setEditorError] = useState<Error | undefined>();
  // const [editorProvider, setEditorProvider] = useState<HocuspocusProvider | undefined>();

  // const { data: node, isLoading } = useQuery({
  //   queryKey: ["node", id],
  //   queryFn: ({ signal }) => getNode(signal, id),
  //   enabled: Boolean(id),
  //   refetchInterval: 5000,
  // });
  const isLoading = false;

  const methodYdoc = useMemo(() => (!id ? undefined : new Y.Doc({ guid: `method-${id}` })), [id]);

  useEffect(() => {
    setConnected(false);
    setSynced(false);
    if (!id || !methodYdoc) {
      return;
    }
    const newProvider = new HocuspocusProvider({
      url: crdtUrl,
      name: `method-${id}`,
      document: methodYdoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Method Canvas Websocket Authentication Failed",
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

    return () => {
      newProvider.destroy();
    };
  }, [id, methodYdoc]);

  const nodesMap = methodYdoc?.getMap<GraphNode>("nodes");
  const edgesMap = methodYdoc?.getMap<GraphEdge>("edges");

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
    method,
    isLoading,
    synced,
    connected,
    error,
    // editorYdoc,
    // editorProvider,
    // graphYdoc,
    // connected: editorConnected && graphConnected,
    // synced: editorSynced && graphSynced,
    nodesMap,
    edgesMap,
    nodes,
    edges,
    nodesSelection,
    setNodesSelection,
    edgesSelection,
    setEdgesSelection,
    // error: editorError || graphError,
    // graphError,
    // graphConnected,
    // graphSynced,
    // editorError,
    // editorConnected,
    // editorSynced,
  };

  return <MethodContext.Provider value={value}>{children}</MethodContext.Provider>;
}
