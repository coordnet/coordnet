import "reactflow/dist/style.css";

import { DragEvent, useRef } from "react";
import ReactFlow, { Controls, useReactFlow } from "reactflow";

import useNode from "@/hooks/useNode";
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
  default: GraphNodeComponent,
};

const Graph = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { nodesMap } = useNode();
  const [nodes, onNodesChange] = useNodesStateSynced();
  const [edges, onEdgesChange, onConnect] = useEdgesStateSynced();
  const { project } = useReactFlow();

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      const id = event.dataTransfer.getData("application/reactflow");
      const position = project({
        x: event.clientX - wrapperBounds.x - 80,
        y: event.clientY - wrapperBounds.top - 20,
      });
      const newNode: GraphNode = {
        id,
        type: "default",
        position,
        data: { id },
      };

      nodesMap.set(newNode.id, newNode);
    }
  };

  return (
    <div className="flex-full h-full">
      <Sidebar />
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
        </ReactFlow>
      </div>
    </div>
  );
};

export default Graph;
