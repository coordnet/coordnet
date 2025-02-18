import { CanvasNode } from "@coordnet/core";
import { Editor } from "@tiptap/react";
import { ReactFlowInstance } from "@xyflow/react";
import React, { createContext } from "react";
import * as Y from "yjs";

/* eslint-disable @typescript-eslint/no-explicit-any */

type FocusContextType = {
  reactFlowInstance: ReactFlowInstance<any, any> | undefined;
  setReactFlowInstance: React.Dispatch<
    React.SetStateAction<ReactFlowInstance<any, any> | undefined>
  >;
  focus: "canvas" | "editor";
  setFocus: React.Dispatch<React.SetStateAction<"canvas" | "editor">>;
  nodesMap: Y.Map<CanvasNode> | undefined;
  setNodesMap: React.Dispatch<React.SetStateAction<Y.Map<CanvasNode> | undefined>>;
  nodes: CanvasNode[];
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  nodeRepositoryVisible: boolean;
  setNodeRepositoryVisible: React.Dispatch<React.SetStateAction<boolean>>;
  editor: Editor | undefined;
  setEditor: React.Dispatch<React.SetStateAction<Editor | undefined>>;
};

/**
 * Context for sharing focus between components
 */
export const FocusContext = createContext<FocusContextType | undefined>(undefined);
