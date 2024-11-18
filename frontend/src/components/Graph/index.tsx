import "reactflow/dist/style.css";
import "./react-flow.css";

import clsx from "clsx";
import { DragEvent, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  NodeDragHandler,
  OnConnect,
  OnEdgesDelete,
  OnNodesDelete,
  SelectionDragHandler,
  useReactFlow,
  XYPosition,
} from "reactflow";

import { useFocus, useNode, useQuickView, useSpace } from "@/hooks";

import Controls from "./Controls";
import { getLayoutedNodes } from "./getLayoutedNodes";
import GraphNodeComponent from "./GraphNode";
import MultiNodeToolbar from "./MultiNodeToolbar";
import Sidebar from "./Sidebar";
import UndoRedo from "./UndoRedo";
import useUndoRedo from "./useUndoRedo";
import useYdocState from "./useYdocState";
import { handleGraphDrop } from "./utils";

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
  const { nodesMap: spaceMap, space } = useSpace();
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
    if (!space?.allowed_actions.includes("write")) return;
    if (!wrapperRef.current) return alert("Could not find Graph wrapperRef.");
    if (!nodesMap || !spaceMap) return alert("Space is not initialised");
    const wrapperBounds = wrapperRef.current.getBoundingClientRect();
    const position: XYPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - wrapperBounds.x - 80,
      y: event.clientY - wrapperBounds.top - 20,
    });

    handleGraphDrop(event.dataTransfer, takeSnapshot, space!, nodesMap, spaceMap, position);
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

  const onConnectWithUndo: OnConnect = useCallback(
    (params) => {
      takeSnapshot();
      onConnect(params);
    },
    [onConnect, takeSnapshot],
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
      <Sidebar
        className="absolute z-40 top-1/2 -translate-y-1/2"
        nodesMap={nodesMap!}
        spaceMap={spaceMap!}
        takeSnapshot={takeSnapshot}
        onLayoutNodes={onLayoutNodes}
      />
      <MultiNodeToolbar />
      <div className="grow h-full Graph" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnectWithUndo}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          onNodeDragStart={onNodeDragStart}
          onSelectionDragStart={onSelectionDragStart}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          attributionPosition="bottom-left"
          nodesConnectable={Boolean(space?.allowed_actions.includes("write"))}
          minZoom={0.1}
          maxZoom={2}
        >
          <Controls />
          {space?.allowed_actions.includes("write") && (
            <UndoRedo undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
          )}
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
