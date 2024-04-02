import "./Editor/styles.css";

import clsx from "clsx";
import { FileText } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { ReactFlowProvider } from "reactflow";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { NodeProvider, useNode } from "@/hooks";

import { EditableNode, Graph, Loader } from "./";
import { Button } from "./ui/button";

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
      <div className="absolute top-0 left-2 z-20 flex h-9 leading-9 gap-2">
        <div className="border border-neutral-200 bg-white text-neutral-900 font-medium px-3 rounded">
          <EditableNode id={id} />
        </div>
        <Button
          variant="outline"
          className="size-9 p-0"
          onClick={() => setNodePage(nodePage == id ? "" : id)}
          data-tooltip-id="show-editor"
          data-tooltip-place="bottom"
        >
          <FileText strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="show-editor">Toggle Editor</Tooltip>
      </div>
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
