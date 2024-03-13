import "reactflow/dist/style.css";
import "./react-flow.css";

import clsx from "clsx";
import { DragEvent, useRef } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, XYPosition } from "reactflow";
import { v4 as uuidv4 } from "uuid";

import useNode from "@/hooks/useNode";
import useSpace from "@/hooks/useSpace";
import { GraphNode } from "@/types";

import GraphNodeComponent from "./GraphNode";
import Sidebar from "./Sidebar";
import useEdgesStateSynced from "./useEdgesStateSynced";
import useNodesStateSynced from "./useNodesStateSynced";

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const nodeTypes = {
  GraphNode: GraphNodeComponent,
};

const Graph = ({ className }: { className?: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { nodesMap } = useNode();
  const { nodesMap: spaceNodesMap } = useSpace();
  const [nodes, onNodesChange] = useNodesStateSynced();
  const [edges, onEdgesChange, onConnect] = useEdgesStateSynced();
  const { screenToFlowPosition } = useReactFlow();

  // useEffect(() => {
  //   nodesMap.forEach((node) => {
  //     nodesMap.set(node.id, { ...node, type: "GraphNode" });
  //   });
  // }, []);

  const addNode = (position: XYPosition) => {
    const id = uuidv4();
    const flowPosition = screenToFlowPosition(position);
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

  return (
    <div className={clsx("h-full select-none", className)}>
      <Sidebar className="absolute z-40 top-1/2 -translate-y-1/2" addNode={addNode} />
      <div className="grow h-full" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
        >
          <Controls />
          <MiniMap pannable={true} />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
