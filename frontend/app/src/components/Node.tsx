import "./Editor/styles.css";

import clsx from "clsx";
import { ReactFlowProvider } from "reactflow";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { NodeProvider, useNode } from "@/hooks";

import { Graph, Loader } from "./";

type NodeProps = { id: string; className?: string };

const Node = ({ id, className }: NodeProps) => {
  const { connected, synced } = useNode();
  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  if (!synced) return <Loader message="Loading node..." />;
  if (!connected) return <Loader message="Obtaining connection to node..." />;

  return (
    <div className={clsx("relative", className)}>
      <button
        className="absolute top-2 left-2 bg-gray-300 p-2 z-20"
        onClick={() => setNodePage(nodePage == id ? "" : id)}
      >
        {nodePage == id ? "Hide" : "Show"} Editor
      </button>
      <Graph />
    </div>
  );
};

const NodeOuter = ({ id, ...props }: NodeProps) => {
  return (
    <NodeProvider id={id}>
      <ReactFlowProvider>
        <Node id={id} {...props} />
      </ReactFlowProvider>
    </NodeProvider>
  );
};

export default NodeOuter;
