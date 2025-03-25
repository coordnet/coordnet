import { CanvasNode } from "@coordnet/core";
import { AlertTriangle } from "lucide-react";
import { Tooltip } from "react-tooltip";

const NodeError = ({ data }: { data: CanvasNode["data"] }) => {
  if (!data.error) return <></>;

  return (
    <div className="nodrag absolute bottom-1 left-1 cursor-default">
      <AlertTriangle
        className="size-3 text-red"
        data-tooltip-id="node-error"
        data-tooltip-place="left"
      />
      <Tooltip id="node-error" className="z-60">
        Error: {data.error}
      </Tooltip>
    </div>
  );
};

export default NodeError;
