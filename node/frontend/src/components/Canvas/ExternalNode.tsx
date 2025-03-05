import { CanvasNode, SpaceNode } from "@coordnet/core";
import { useQuery } from "@tanstack/react-query";
import { Handle, NodeResizer, Position } from "@xyflow/react";
import clsx from "clsx";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import store from "store2";

import { getNode } from "@/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvas, useNodesContext } from "@/hooks";
import { createConnectedYDoc } from "@/lib/utils";

const handleStyle: CSSProperties = {
  borderWidth: "3px",
  borderColor: "#fff",
  width: 10,
  height: 10,
};

interface CanvasNodeComponentProps {
  id: string;
  data: CanvasNode["data"];
  selected: boolean;
}

const ExternalNodeComponent = ({ id, data, selected }: CanvasNodeComponentProps) => {
  const { nodesMap: spaceMap } = useNodesContext();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [lineClamp, setLineClamp] = useState<number>(3);
  const { nodesMap } = useCanvas();

  useEffect(() => {
    if (!nodeRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setLineClamp(Math.floor((nodeRef?.current?.clientHeight ?? 0) / 20) - 1);
    });
    resizeObserver.observe(nodeRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  const {
    data: node,
    error: nodeLoadError,
    isLoading,
  } = useQuery({
    queryKey: ["node", id],
    queryFn: ({ signal }) => getNode(signal, data?.externalNode?.nodeId),
    refetchInterval: 0,
    retry: 0,
  });

  useEffect(() => {
    if (nodeLoadError) {
      setError(nodeLoadError);
      setLoading(false);
    }
  }, [nodeLoadError]);

  const loadExternalNode = useCallback(async () => {
    try {
      if (!data?.externalNode?.nodeId) {
        throw new Error("External Node ID is missing");
      }
      const token = store("coordnet-auth");
      const [spaceDoc] = await createConnectedYDoc(`space-${data?.externalNode?.spaceId}`, token);
      const nodes = spaceDoc.getMap<SpaceNode>("nodes");
      const node = nodes.get(data?.externalNode?.nodeId);
      setTitle(node?.title ?? "Untitled");
      spaceMap?.set(id, { id, title: node?.title ?? "Untitled" });
      setLoading(false);
    } catch (e) {
      setError(e as Error);
    }
  }, [data?.externalNode?.nodeId, data?.externalNode?.spaceId, id, spaceMap]);

  useEffect(() => {
    if (node && !isLoading) {
      loadExternalNode();
    }
  }, [node, isLoading, loadExternalNode]);

  const setDepth = (depth: number) => {
    const node = nodesMap?.get(id);
    if (node?.data?.externalNode) {
      nodesMap?.set(id, {
        ...node,
        data: { ...node?.data, externalNode: { ...node?.data?.externalNode, depth } },
      });
    }
  };

  const nodeStyle: CSSProperties = { background: "", opacity: 1 };
  if (data?.state === "active") {
    nodeStyle.borderColor = "rgb(101, 12, 215)";
    nodeStyle.borderWidth = "2px";
  }

  return (
    <>
      <NodeResizer
        color="transparent"
        isVisible={true}
        minWidth={100}
        minHeight={30}
        lineStyle={{ borderWidth: 5 }}
        handleStyle={{ borderWidth: 5, borderColor: "transparent" }}
      />
      <Handle id="target-top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="target-left" type="target" position={Position.Left} style={handleStyle} />
      <div
        className={clsx(
          `CanvasNode flex size-full items-center justify-center overflow-hidden rounded-lg border
          border-gray-1 bg-white p-3 text-center text-sm`,
          error && "border-red-600 text-red-600",
          selected && "shadow-node-selected"
        )}
        style={nodeStyle}
        ref={nodeRef}
      >
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <div
              className="nodrag absolute left-0 top-0 m-1 flex h-3 max-w-[90px] cursor-pointer
                items-center rounded-full bg-violet-200 px-1.5 text-[8px] font-bold
                text-neutral-600"
            >
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                Depth {data?.externalNode?.depth}
              </div>
              <ChevronDown className="size-2 flex-shrink-0 pl-0.5 text-black" strokeWidth={4} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-neutral-700" sideOffset={8}>
            <DropdownMenuItem
              className="flex cursor-pointer items-center text-sm font-medium capitalize
                text-neutral-700"
              onClick={() => setDepth(0)}
            >
              Depth 0
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center text-sm font-medium capitalize
                text-neutral-700"
              onClick={() => setDepth(1)}
            >
              Depth 1
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center text-sm font-medium capitalize
                text-neutral-700"
              onClick={() => setDepth(2)}
            >
              Depth 2
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          to={`/spaces/${data?.externalNode?.spaceId}/${data?.externalNode?.nodeId}`}
          target="_blank"
        >
          <div className="absolute right-2 top-0 flex items-center text-[10px]">
            External Data <ExternalLink className="-mt-0.5 ml-1 size-2.5" />
          </div>
        </Link>
        {window.location.hostname === "localhost" && (
          <div className="absolute bottom-0 right-2 text-[10px]">{String(id).slice(0, 8)}</div>
        )}

        {error ? (
          `Error: ${error.message}`
        ) : loading ? (
          <>
            Loading External Node <Loader2 className="ml-2 size-3 animate-spin" />
          </>
        ) : (
          <div className={`w-full items-center justify-center line-clamp-${lineClamp}`}>
            {title}
          </div>
        )}
      </div>
      <Handle id="target-bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="target-right" type="source" position={Position.Right} style={handleStyle} />
    </>
  );
};

export default ExternalNodeComponent;
