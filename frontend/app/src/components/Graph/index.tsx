import "reactflow/dist/style.css";
import "./react-flow.css";

import clsx from "clsx";
import { Map, Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { DragEvent, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  NodeDragHandler,
  OnEdgesDelete,
  OnNodesDelete,
  Panel,
  SelectionDragHandler,
  useReactFlow,
  XYPosition,
} from "reactflow";
import useLocalStorageState from "use-local-storage-state";
import { v4 as uuidv4 } from "uuid";

import { useFocus, useNode, useQuickView, useSpace } from "@/hooks";
import { GraphNode } from "@/types";

import { Button } from "../ui/button";
import GraphNodeComponent from "./GraphNode";
import Sidebar from "./Sidebar";
import useUndoRedo from "./useUndoRedo";
import useYdocState from "./useYdocState";

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const nodeTypes = {
  GraphNode: GraphNodeComponent,
};

const Graph = ({ className }: { className?: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, nodesMap, setNodesSelection } = useNode();
  const { nodesMap: spaceNodesMap } = useSpace();
  const { isQuickViewOpen } = useQuickView();
  const [onNodesChange, onEdgesChange, onConnect] = useYdocState();
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();
  const { setReactFlowInstance, setNodesMap, setNodes, setFocus, focus } = useFocus();
  const { zoomIn, zoomOut, fitView } = reactFlowInstance;
  const [miniMapVisible, setMiniMapVisible] = useLocalStorageState("coordnet:miniMapVisible", {
    defaultValue: true,
  });

  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
    setNodesMap(nodesMap);
    setNodes(nodes);

    return () => {
      setReactFlowInstance(undefined);
      setNodesMap(undefined);
      setNodes([]);
    };
  }, [
    isQuickViewOpen,
    setNodes,
    nodes,
    reactFlowInstance,
    setReactFlowInstance,
    nodesMap,
    setNodesMap,
  ]);

  // useEffect(() => {
  //   nodesMap.forEach((node) => {
  //     // if (!node.position) nodesMap.delete(node.id);
  //     // nodesMap.set(node.id, { ...node, type: "GraphNode" });
  //   });
  // }, []);

  const addNode = (position: XYPosition) => {
    takeSnapshot();
    const id = uuidv4();
    const flowPosition = reactFlowInstance.screenToFlowPosition(position);
    if (!flowPosition) alert("Failed to add node");
    const newNode: GraphNode = {
      id,
      type: "GraphNode",
      position: flowPosition,
      style: { width: 200, height: 80 },
      data: {},
    };
    spaceNodesMap?.set(id, { id: id, title: "New node" });
    nodesMap.set(newNode.id, newNode);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      addNode({
        x: event.clientX - wrapperBounds.x - 80,
        y: event.clientY - wrapperBounds.top - 20,
      });
    }
  };

  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onSelectionDragStart: SelectionDragHandler = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodesDelete: OnNodesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isEditable = target.isContentEditable;
      const isInputLike =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (focus !== "graph" || isEditable || isInputLike) {
        return;
      }

      if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
        // Select all nodes
        setNodesSelection(new Set(nodes.map((n) => n.id)));
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", keyDownHandler);
    return () => document.removeEventListener("keydown", keyDownHandler);
  }, [focus]);

  return (
    <div className={clsx("h-full select-none", className)} onClick={() => setFocus("graph")}>
      <Sidebar className="absolute z-40 top-1/2 -translate-y-1/2" addNode={addNode} />
      <div className="grow h-full" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={(params) => {
            takeSnapshot();
            onConnect(params);
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          onNodeDragStart={onNodeDragStart}
          onSelectionDragStart={onSelectionDragStart}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          attributionPosition="bottom-left"
        >
          <Panel position="top-right" className="flex gap-1 !top-0 !right-2 !m-0">
            <Button className="size-9 p-0" variant="outline" disabled={canUndo} onClick={undo}>
              <Undo2 className="size-5" />
            </Button>
            <Button className="size-9 p-0" variant="outline" disabled={canRedo} onClick={redo}>
              <Redo2 className="size-5" />
            </Button>
          </Panel>
          <Panel position="bottom-right" className="flex gap-1 !bottom-2 !right-2 !m-0">
            <Button className="size-9 p-0" variant="outline" onClick={() => zoomIn()}>
              <ZoomIn className="size-5" />
            </Button>
            <Button className="size-9 p-0" variant="outline" onClick={() => zoomOut()}>
              <ZoomOut className="size-5" />
            </Button>
            <Button className="size-9 p-0" variant="outline" onClick={() => fitView()}>
              <Maximize className="size-5" />
            </Button>
            <Button
              className="size-9 p-0"
              variant="outline"
              onClick={() => setMiniMapVisible(!miniMapVisible)}
            >
              <Map className="size-5" />
            </Button>
          </Panel>
          {miniMapVisible && <MiniMap pannable={true} className="!bottom-12 !right-2 !m-0 !mb-1" />}
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
