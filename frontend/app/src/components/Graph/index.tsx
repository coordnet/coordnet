import "reactflow/dist/style.css";
import "./react-flow.css";

import clsx from "clsx";
import DOMPurify from "dompurify";
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
import { v4 as uuidv4 } from "uuid";

import { ALLOWED_TAGS, FORBID_ATTR } from "@/constants";
import { useFocus, useNode, useQuickView, useSpace } from "@/hooks";
import { readPdf } from "@/lib/pdfjs";
import { GraphNode } from "@/types";
import { waitForNode } from "@/utils";

import Controls from "./Controls";
import { getLayoutedNodes } from "./getLayoutedNodes";
import GraphNodeComponent from "./GraphNode";
import MultiNodeToolbar from "./MultiNodeToolbar";
import Sidebar from "./Sidebar";
import UndoRedo from "./UndoRedo";
import useUndoRedo from "./useUndoRedo";
import useYdocState from "./useYdocState";
import { addNodeToGraph } from "./utils";

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const nodeTypes = {
  GraphNode: GraphNodeComponent,
};

const Graph = ({ className }: { className?: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, nodesMap, setNodesSelection, node } = useNode();
  const { nodesMap: spaceNodesMap } = useSpace();
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

  const addNode = async (position: XYPosition) => {
    takeSnapshot();
    const id = uuidv4();
    const flowPosition = reactFlowInstance.screenToFlowPosition(position);
    if (!flowPosition) alert("Failed to add node");
    if (!nodesMap) return alert("nodesMap is not initialised");
    const newNode: GraphNode = {
      id,
      type: "GraphNode",
      position: flowPosition,
      style: { width: 200, height: 80 },
      data: { syncing: true, editing: true },
    };
    spaceNodesMap?.set(id, { id: id, title: "New node" });
    nodesMap.set(newNode.id, newNode);
    await waitForNode(id);
    const node = nodesMap.get(newNode.id);
    if (node) nodesMap.set(newNode.id, { ...node, data: { ...node.data, syncing: false } });
    return id;
  };

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (!node?.allowed_actions.includes("write")) return;
    if (!wrapperRef.current) return alert("Could not find Graph wrapperRef.");
    if (!nodesMap) return alert("nodesMap is not initialised");
    const transferredHtml = event.dataTransfer.getData("text/html");
    const wrapperBounds = wrapperRef.current.getBoundingClientRect();

    // Check if a file was dropped and if it's a PDF:
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
        const pdfText = await readPdf(arrayBuffer);
        if (!spaceNodesMap) return alert("spaceNodesMap not found");
        const position: XYPosition = {
          x: event.clientX - wrapperBounds.x - 80,
          y: event.clientY - wrapperBounds.top - 20,
        };
        addNodeToGraph(reactFlowInstance, nodesMap, spaceNodesMap, file.name, pdfText, position);
      }
    } else if (transferredHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(transferredHtml, "text/html");
      const listItems = doc.querySelectorAll("li");
      if (!spaceNodesMap) return alert("spaceNodesMap not found");

      if (listItems.length > 0) {
        listItems.forEach((li, index) => {
          const position: XYPosition = {
            x: event.clientX - wrapperBounds.x - 80 + index * 25,
            y: event.clientY - wrapperBounds.top - 20 + index * 50,
          };

          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = li.innerHTML;
          tempDiv.querySelectorAll("ul, ol").forEach((subList) => subList.remove());
          const cleaned = DOMPurify.sanitize(tempDiv, { ALLOWED_TAGS, FORBID_ATTR });

          addNodeToGraph(reactFlowInstance, nodesMap, spaceNodesMap, cleaned, undefined, position);
        });
      } else {
        const cleaned = DOMPurify.sanitize(transferredHtml, { ALLOWED_TAGS, FORBID_ATTR });
        addNodeToGraph(reactFlowInstance, nodesMap, spaceNodesMap, cleaned, undefined, {
          x: event.clientX - wrapperBounds.x - 80,
          y: event.clientY - wrapperBounds.top - 20,
        });
      }
    } else {
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
        addNode={addNode}
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
          nodesConnectable={Boolean(node?.allowed_actions.includes("write"))}
          minZoom={0.1}
          maxZoom={2}
        >
          <Controls />
          {node?.allowed_actions.includes("write") && (
            <UndoRedo undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
          )}
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
