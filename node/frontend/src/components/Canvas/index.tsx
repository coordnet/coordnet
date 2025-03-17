import "@xyflow/react/dist/style.css";
import "./react-flow.css";

import {
  Background,
  OnConnect,
  OnEdgesDelete,
  OnNodeDrag,
  OnNodesDelete,
  ReactFlow,
  SelectionDragHandler,
  useReactFlow,
  XYPosition,
} from "@xyflow/react";
import clsx from "clsx";
import { DragEvent, useCallback, useEffect, useRef } from "react";

import { useCanvas, useFocus, useNodesContext, useQuickView, useYDoc } from "@/hooks";
import { YDocScope } from "@/types";

import SkillCanvasControls from "../Skills/SkillCanvasControls";
import CanvasNodeComponent from "./CanvasNode";
import ConnectionLine from "./ConnectionLine";
import Controls from "./Controls";
import { getLayoutedNodes } from "./getLayoutedNodes";
import MultiNodeToolbar from "./MultiNodeToolbar";
import Sidebar from "./Sidebar";
import UndoRedo from "./UndoRedo";
import useUndoRedo from "./useUndoRedo";
import useYdocState from "./useYdocState";
import { handleCanvasDrop } from "./utils";

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const nodeTypes = { GraphNode: CanvasNodeComponent };

const Canvas = ({ className }: { className?: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { parent, scope } = useYDoc();
  const { nodes, edges, nodesMap, setNodesSelection } = useCanvas();
  const { nodesMap: spaceMap } = useNodesContext();
  const { isQuickViewOpen } = useQuickView();
  const [onNodesChange, onEdgesChange, onConnect] = useYdocState();
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();
  const { setReactFlowInstance, setNodesMap, setNodes, setFocus, focus } = useFocus();

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

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (scope !== YDocScope.READ_WRITE) return;
    if (!wrapperRef.current) return alert("Could not find Canvas wrapperRef.");
    if (!nodesMap || !spaceMap) return alert("Space is not initialised");
    const wrapperBounds = wrapperRef.current.getBoundingClientRect();
    const position: XYPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - wrapperBounds.x - 80,
      y: event.clientY - wrapperBounds.top - 20,
    });

    handleCanvasDrop(event.dataTransfer, takeSnapshot, parent, nodesMap, spaceMap, position);
  };

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
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

  const onConnectWithUndo: OnConnect = useCallback(
    (params) => {
      takeSnapshot();
      const selectedNodes = nodes.filter((node) => node.selected);

      if (selectedNodes.length > 1) {
        selectedNodes.forEach((node) => {
          onConnect({ ...params, source: node.id });
        });
      } else {
        onConnect(params);
      }
    },
    [nodes, onConnect, takeSnapshot]
  );

  const onLayoutNodes = useCallback(async () => {
    takeSnapshot();
    const layouted = await getLayoutedNodes(nodes, edges, "DOWN");
    for (const node of layouted) {
      const mapNode = nodesMap?.get(node.id);
      if (mapNode) {
        nodesMap?.set(node.id, { ...mapNode, position: node.position });
      }
    }
  }, [edges, nodes, nodesMap, takeSnapshot]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isEditable = target.isContentEditable;
      const isInputLike =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (focus !== "canvas" || isEditable || isInputLike) {
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
  }, [focus, nodes, setNodesSelection]);

  return (
    <div className={clsx("h-full select-none", className)} onClick={() => setFocus("canvas")}>
      <Sidebar
        className="absolute top-1/2 z-40 -translate-y-1/2"
        takeSnapshot={takeSnapshot}
        onLayoutNodes={onLayoutNodes}
      />
      <MultiNodeToolbar />
      <div className="Canvas h-full grow" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnectWithUndo}
          onDrop={onDrop}
          onDragOver={onDragOver}
          connectionLineComponent={ConnectionLine}
          nodeTypes={nodeTypes}
          onNodeDragStart={onNodeDragStart}
          onSelectionDragStart={onSelectionDragStart}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          attributionPosition="bottom-left"
          nodesConnectable={scope == YDocScope.READ_WRITE}
          // nodesDraggable={!isSkillRun && scope == YDocScope.READ_WRITE}
          minZoom={0.1}
          maxZoom={2}
        >
          <Controls />
          <SkillCanvasControls />
          {scope == YDocScope.READ_WRITE && (
            <UndoRedo undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
          )}
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Canvas;
