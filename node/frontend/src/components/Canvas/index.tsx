import "@xyflow/react/dist/style.css";
import "./react-flow.css";

import { getLayoutedNodes } from "@coordnet/core";
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
import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  ContextMenuProvider,
  useCanvas,
  useContextMenu,
  useFocus,
  useNodesContext,
  useQuickView,
  useYDoc,
} from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";
import { useKeyboardState } from "@/hooks";

import NodeRepositorySelector from "../NodeRepositorySelector";
import SkillCanvasControls from "../Skills/SkillCanvasControls";
import ConnectionLine from "./ConnectionLine";
import CanvasContextMenu from "./ContextMenu";
import Controls from "./Controls";
import useUndoRedo from "./hooks/useUndoRedo";
import useYdocState from "./hooks/useYdocState";
import MultiNodeToolbar from "./MultiNodeToolbar";
import CanvasNodeComponent from "./Nodes/CanvasNode";
import ExternalNodeComponent from "./Nodes/ExternalNode";
import Sidebar from "./Sidebar";
import UndoRedo from "./UndoRedo";
import { handleCanvasDrop } from "./utils/handleCanvasDrop";
import { AlignmentGuides } from "./AlignmentGuides";
import { PixelDistances } from "./PixelDistances";
import { AutoAlignmentOptions } from "./AutoAlignment";
import { useMultiSelectResize, MultiSelectOverlay } from "./MultiSelectResize";

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const nodeTypes = { GraphNode: CanvasNodeComponent, ExternalNode: ExternalNodeComponent };

interface CanvasProps {
  className?: string;
  showAlignmentGuides?: boolean;
  showPixelDistances?: boolean;
  autoAlignmentOptions?: AutoAlignmentOptions;
  snapThreshold?: number;
  showMeasurements?: boolean;
  enableSmartGuides?: boolean;
  enableDistributionGuides?: boolean;
  enableSpacingGuides?: boolean;
  enableAdvancedAlignment?: boolean;
  enableCenterSnapping?: boolean;
}

const CanvasComponent = ({
  className,
  showAlignmentGuides = true,
  showPixelDistances = true,
  autoAlignmentOptions = {
    enabled: false,
    mode: "horizontal",
    spacing: 20,
    startPosition: { x: 100, y: 100 },
  },
  snapThreshold = 10,
  showMeasurements = true,
  enableSmartGuides = true,
  enableDistributionGuides = true,
  enableSpacingGuides = true,
  enableAdvancedAlignment = true,
  enableCenterSnapping = true,
}: CanvasProps) => {
  const { spaceId, skillId, pageId } = useParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const {
    parent,
    scope,
    space: { YDoc: spaceDoc },
  } = useYDoc();
  const { nodes, edges, nodesMap, edgesMap, setNodesSelection } = useCanvas();
  const { nodesMap: spaceMap } = useNodesContext();
  const { isQuickViewOpen } = useQuickView();
  const [onNodesChange, onEdgesChange, onConnect] = useYdocState();
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();
  const { setReactFlowInstance, setNodesMap, setNodes, setFocus, focus } = useFocus();
  const { onNodeContextMenuHandler, onSelectionContextMenuHandler, handlePaneClick } =
    useContextMenu();

  // Alignment features state
  const { isAltPressed, isShiftPressed } = useKeyboardState();
  const [isDragging, setIsDragging] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | undefined>(undefined);
  // Alignment settings now handled in Node.tsx component

  // Multi-select and resize hooks
  const {
    isMultiSelecting,
    selectionBox,
    startMultiSelect,
    updateSelectionBox,
    endMultiSelect,
    getNodesInSelectionBox,
    // resizeSelectedNodes,
    // moveSelectedNodes,
  } = useMultiSelectResize();

  // Auto alignment hook (available for future use)
  // const { calculateAutoAlignment } = useAutoAlignment();

  const spaceModel = parent?.type === BackendEntityType.SPACE ? parent.data : undefined;

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
    if (scope === YDocScope.READ_ONLY) return;
    if (!wrapperRef.current) return alert("Could not find Canvas wrapperRef.");
    if (!nodesMap || !spaceMap) return alert("Space is not initialised");
    const wrapperBounds = wrapperRef.current.getBoundingClientRect();
    const position: XYPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - wrapperBounds.x - 80,
      y: event.clientY - wrapperBounds.top - 20,
    });

    handleCanvasDrop(
      event.dataTransfer,
      takeSnapshot,
      parent,
      nodesMap,
      spaceMap,
      position,
      spaceDoc,
      spaceId,
      pageId || spaceModel?.default_node || skillId,
      edgesMap,
      autoAlignmentOptions
    );
  };

  const onNodeDragStart: OnNodeDrag = useCallback((_, node) => {
    takeSnapshot();
    setIsDragging(true);
    setDraggingNodeId(node.id);
  }, [takeSnapshot]);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    setIsDragging(false);
    setDraggingNodeId(undefined);
  }, []);

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

  const onLayoutNodes = useCallback(
    async (direction: "RIGHT" | "DOWN" = "DOWN") => {
      takeSnapshot();
      const layouted = await getLayoutedNodes(nodes, edges, direction);
      for (const node of layouted) {
        const mapNode = nodesMap?.get(node.id);
        if (mapNode) {
          nodesMap?.set(node.id, { ...mapNode, position: node.position });
        }
      }
    },
    [edges, nodes, nodesMap, takeSnapshot]
  );

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

  // Multi-select mouse handlers
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (focus !== "canvas" || event.button !== 0) return; // Left click only
      
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
        return; // Don't start selection if clicking on nodes or edges
      }

      if (isShiftPressed) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
          const startX = event.clientX - rect.left;
          const startY = event.clientY - rect.top;
          startMultiSelect(startX, startY);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isMultiSelecting && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const endX = event.clientX - rect.left;
        const endY = event.clientY - rect.top;
        updateSelectionBox(endX, endY);
      }
    };

    const handleMouseUp = () => {
      if (isMultiSelecting) {
        const selectedNodes = selectionBox ? getNodesInSelectionBox(nodes, selectionBox) : [];
        if (selectedNodes.length > 0) {
          const selectedIds = new Set(selectedNodes.map(node => node.id));
          setNodesSelection(selectedIds);
        }
        endMultiSelect();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [focus, isShiftPressed, isMultiSelecting, selectionBox, nodes, getNodesInSelectionBox, setNodesSelection, startMultiSelect, updateSelectionBox, endMultiSelect]);

  return (
    <div className={clsx("h-full select-none", className)} onClick={() => setFocus("canvas")}>
      <Sidebar
        className="absolute top-1/2 z-40 -translate-y-1/2"
        takeSnapshot={takeSnapshot}
        onLayoutNodes={onLayoutNodes}
      />
      <MultiNodeToolbar />
      


      <div className="Canvas h-full grow relative" ref={wrapperRef}>
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
          onNodeDragStop={onNodeDragStop}
          onSelectionDragStart={onSelectionDragStart}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          attributionPosition="bottom-left"
          nodesConnectable={scope !== YDocScope.READ_ONLY}
          onNodeContextMenu={onNodeContextMenuHandler}
          onSelectionContextMenu={onSelectionContextMenuHandler}
          onPaneClick={handlePaneClick}
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

        {/* Alignment Guides Overlay */}
        {showAlignmentGuides && (
          <AlignmentGuides
            nodes={nodes}
            draggingNodeId={draggingNodeId}
            isDragging={isDragging}
            snapThreshold={snapThreshold}
            enableHapticFeedback={true}
            showMeasurements={showMeasurements}
            enableSmartGuides={enableSmartGuides}
            enableDistributionGuides={enableDistributionGuides}
            enableSpacingGuides={enableSpacingGuides}
            enableAdvancedAlignment={enableAdvancedAlignment}
            enableCenterSnapping={enableCenterSnapping}
          />
        )}

        {/* Pixel Distances Overlay */}
        {showPixelDistances && (
          <PixelDistances
            nodes={nodes}
            isAltPressed={isAltPressed}
            selectedNodeId={draggingNodeId}
          />
        )}

        {/* Multi-select Overlay */}
        <MultiSelectOverlay selectionBox={selectionBox} />
      </div>

      <CanvasContextMenu nodesMap={nodesMap} spaceMap={spaceMap} />
      <NodeRepositorySelector />
    </div>
  );
};

const Canvas = (props: CanvasProps) => {
  return (
    <ContextMenuProvider>
      <CanvasComponent {...props} />
    </ContextMenuProvider>
  );
};

export default Canvas;
