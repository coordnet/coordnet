import "reactflow/dist/style.css";
import "./react-flow.css";

import clsx from "clsx";
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
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
  const { nodes, edges, nodesMap } = useNode();
  const { nodesMap: spaceNodesMap } = useSpace();
  const { isQuickViewOpen } = useQuickView();
  const [onNodesChange, onEdgesChange, onConnect] = useYdocState();
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();
  const { setReactFlowInstance, setNodesMap, setNodes, setFocus } = useFocus();
  const { zoomIn, zoomOut, fitView } = reactFlowInstance;

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
        >
          <Panel position="bottom-right" className="flex gap-1 !bottom-3">
            <Button className="size-7 p-0" variant="outline" onClick={() => zoomIn()}>
              <ZoomIn className="size-4" />
            </Button>
            <Button className="size-7 p-0" variant="outline" onClick={() => zoomOut()}>
              <ZoomOut className="size-4" />
            </Button>
            <Button className="size-7 p-0" variant="outline" onClick={() => fitView()}>
              <Maximize className="size-4" />
            </Button>
            <Button className="size-7 p-0 ml-2" variant="outline" disabled={canUndo} onClick={undo}>
              <Undo2 className="size-4" />
            </Button>
            <Button className="size-7 p-0" variant="outline" disabled={canRedo} onClick={redo}>
              <Redo2 className="size-4" />
            </Button>
          </Panel>
          <MiniMap pannable={true} className="!bottom-12" />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
