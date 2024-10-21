import { Editor } from "@tiptap/react";
import React, { createContext } from "react";
import { ReactFlowInstance } from "reactflow";
import * as Y from "yjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { GraphNode } from "@/types";

type FocusContextType = {
  reactFlowInstance: ReactFlowInstance<any, any> | undefined;
  setReactFlowInstance: React.Dispatch<
    React.SetStateAction<ReactFlowInstance<any, any> | undefined>
  >;
  focus: "graph" | "editor";
  setFocus: React.Dispatch<React.SetStateAction<"graph" | "editor">>;
  nodesMap: Y.Map<GraphNode> | undefined;
  setNodesMap: React.Dispatch<React.SetStateAction<Y.Map<GraphNode> | undefined>>;
  nodes: GraphNode[];
  setNodes: React.Dispatch<React.SetStateAction<GraphNode[]>>;
  nodeRepositoryVisible: boolean;
  setNodeRepositoryVisible: React.Dispatch<React.SetStateAction<boolean>>;
  editor: Editor | undefined;
  setEditor: React.Dispatch<React.SetStateAction<Editor | undefined>>;
};

/**
 * Context for sharing focus between components
 */
export const FocusContext = createContext<FocusContextType | undefined>(undefined);
