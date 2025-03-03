import { CanvasNode } from "@coordnet/core";
import { Editor } from "@tiptap/react";
import { ReactFlowInstance } from "@xyflow/react";
import React, { useState } from "react";
import * as Y from "yjs";

import { FocusContext } from "./context";

/**
 * Provider for sharing focus between components
 */
export const FocusProvider = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any>>();
  const [nodesMap, setNodesMap] = useState<Y.Map<CanvasNode>>();
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [focus, setFocus] = useState<"canvas" | "editor">("canvas");
  const [nodeRepositoryVisible, setNodeRepositoryVisible] = useState<boolean>(false);
  const [editor, setEditor] = useState<Editor>();

  const value = {
    reactFlowInstance,
    setReactFlowInstance,
    focus,
    setFocus,
    nodesMap,
    setNodesMap,
    nodes,
    setNodes,
    nodeRepositoryVisible,
    setNodeRepositoryVisible,
    editor,
    setEditor,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
};
