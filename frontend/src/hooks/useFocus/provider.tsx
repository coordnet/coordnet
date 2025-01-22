import { Editor } from "@tiptap/react";
import React, { useState } from "react";
import { ReactFlowInstance } from "reactflow";
import * as Y from "yjs";

import { CanvasNode } from "@/types";

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
