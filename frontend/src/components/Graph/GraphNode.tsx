import clsx from "clsx";
import { saveAs } from "file-saver";
import { Loader2, LoaderIcon } from "lucide-react";
import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import { Handle, NodeResizer, NodeToolbar, Position } from "reactflow";
import pSBC from "shade-blend-color";
import { toast } from "sonner";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCanvas, useNodesContext, useQuickView } from "@/hooks";
import { exportNode, slugifyNodeTitle } from "@/lib/nodes";
import { BackendEntityType, GraphNode, NodeType, nodeTypeMap } from "@/types";

import { EditableNode } from "../";
import Footer from "./Footer";
import HoverMenu from "./HoverMenu";

const handleStyle: CSSProperties = {
  borderWidth: "3px",
  borderColor: "#fff",
  width: 10,
  height: 10,
};

interface GraphNodeComponentProps {
  id: string;
  data: GraphNode["data"];
  selected: boolean;
}

const GraphNodeComponent = ({ id, data, selected }: GraphNodeComponentProps) => {
  const { nodesMap: spaceMap } = useNodesContext();
  const { nodesMap, nodeFeatures, parent } = useCanvas();
  const { showQuickView } = useQuickView();
  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const inputRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lineClamp, setLineClamp] = useState<number>(3);

  const { hasPage, hasGraph } = nodeFeatures(id);

  const isMethod = parent.type === BackendEntityType.METHOD;

  useEffect(() => {
    if (!nodeRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setLineClamp(Math.floor((nodeRef?.current?.clientHeight ?? 0) / 20) - 1);
    });
    resizeObserver.observe(nodeRef.current);
    return () => resizeObserver.disconnect(); // clean up
  }, []);

  useEffect(() => {
    if (data?.editing === true) {
      onClickEdit();
    }
  }, [data]);

  const onClickEdit = (e?: MouseEvent) => {
    e?.preventDefault();
    setIsEditing(true);
    setTimeout(function () {
      if (!inputRef.current) return;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      inputRef?.current?.scrollTo(0, inputRef?.current?.scrollHeight);
    }, 0);
  };

  const onDoubleClick = (e: MouseEvent) => {
    if (isEditing || data?.syncing) return;
    e.preventDefault();
    if (!hasPage && hasGraph) showQuickView(id);
    else setNodePage(id);
  };

  const onExportNode = async (includeSubNodes = false) => {
    toast.promise(exportNode(id, nodesMap, spaceMap, includeSubNodes), {
      loading: "Exporting...",
      success: (data) => {
        if (data) {
          const title = slugifyNodeTitle(data.title);
          const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
          saveAs(blob, `node-${data.id.slice(0, 8)}-${title}.coordnode`);
        }
        return "Node exported";
      },
      error: "Error exporting node",
    });
  };

  const nodeStyle: CSSProperties = { background: "", opacity: 1 };
  if (data.borderColor) nodeStyle.borderColor = data.borderColor;
  if (data?.state === "active" || data?.state === "executing") {
    nodeStyle.borderColor = "rgb(101, 12, 215)";
    nodeStyle.borderWidth = "2px";
  }
  if (data?.progress)
    nodeStyle.background = `linear-gradient(to right, ${
      data?.borderColor ? pSBC(0.9, data?.borderColor) : "#eeeeee"
    } ${data?.progress}%, white ${data?.progress}%)`;
  if (data?.loading) nodeStyle.opacity = 0.5;

  return (
    <>
      <NodeToolbar
        isVisible={data.forceToolbarVisible || undefined}
        position={data.toolbarPosition}
      >
        <HoverMenu id={id} data={data} onClickEdit={onClickEdit} />
      </NodeToolbar>
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
      <ContextMenu>
        <ContextMenuTrigger disabled={isMethod}>
          <div
            className={clsx(
              `GraphNode flex size-full items-center justify-center overflow-hidden rounded-lg
              border border-gray-1 bg-white p-3 text-center text-sm`,
              Boolean(data.borderColor) && "border-2",
              selected && "shadow-node-selected"
            )}
            style={nodeStyle}
            ref={nodeRef}
            onDoubleClick={onDoubleClick}
          >
            {data?.syncing && (
              <>
                <div
                  className={clsx(
                    `nodrag absolute -top-2 right-2 flex h-4 cursor-default items-center
                    justify-center gap-1 rounded border border-gray-1 bg-white px-1 text-[10px]`
                  )}
                  style={{ borderColor: nodeStyle.borderColor }}
                  data-tooltip-id="syncing"
                  data-tooltip-place="top"
                >
                  Syncing <Loader2 className="size-2.5 animate-spin" />
                </div>
                <Tooltip id="syncing">
                  <div className="w-[180px] text-xs">
                    Some features of a node such as the node page or graph are only available after
                    the initial sync
                  </div>
                </Tooltip>
              </>
            )}
            {data?.type && data?.type !== NodeType.Default && (
              <div className="absolute left-2 top-0 text-[10px]">
                {nodeTypeMap[data.type as NodeType]}
              </div>
            )}
            {/* if domain is localhost show the id */}
            {window.location.hostname === "localhost" && (
              <div className="absolute right-2 top-0 text-[10px]">{id.slice(0, 8)}</div>
            )}
            {data?.state && data?.state == "executing" && (
              <div
                className={clsx(
                  `nodrag absolute right-2 top-[-7px] flex size-4 cursor-pointer items-center
                  justify-center gap-1 rounded border border-purple bg-white`
                )}
              >
                <LoaderIcon className="size-3 animate-spin text-purple" />
              </div>
            )}

            <EditableNode
              id={id}
              ref={inputRef}
              onBlur={() => {
                setIsEditing(false);
                inputRef?.current?.scrollTo(0, 0);
                const node = nodesMap?.get(id);
                if (node) nodesMap?.set(id, { ...node, data: { ...node.data, editing: false } });
              }}
              contentEditable={isEditing}
              className={clsx(
                "w-full items-center justify-center",
                isEditing && "nodrag h-full cursor-text overflow-hidden",
                !isEditing && `line-clamp-${lineClamp}`
              )}
            />
            <Footer id={id} nodeStyle={nodeStyle} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onExportNode(false)}>Export Node</ContextMenuItem>
          {/* TODO: Fix this */}
          {hasGraph && (
            <ContextMenuItem onClick={() => onExportNode(true)}>
              Export Node & Canvas Nodes
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Handle id="target-bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="target-right" type="source" position={Position.Right} style={handleStyle} />
    </>
  );
};

export default GraphNodeComponent;
