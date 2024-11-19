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
import { useNode, useQuickView, useSpace } from "@/hooks";
import { exportNode, slugifyNodeTitle } from "@/lib/nodes";
import { GraphNode, NodeType, nodeTypeMap } from "@/types";

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
  const { nodesMap: spaceMap } = useSpace();
  const { nodesMap, node } = useNode();
  const { showQuickView } = useQuickView();
  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const inputRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lineClamp, setLineClamp] = useState<number>(3);

  const backendNode = node?.subnodes.find((node) => node.id === id);
  const hasGraph = backendNode?.has_subnodes;
  const hasPage = Boolean(backendNode?.text_token_count);

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
        <ContextMenuTrigger>
          <div
            className={clsx(
              "GraphNode border border-gray-1 rounded-lg p-3 bg-white",
              "size-full overflow-hidden flex items-center justify-center text-center text-sm",
              {
                "border-2": Boolean(data.borderColor),
                "shadow-node-selected": selected,
              },
            )}
            style={nodeStyle}
            ref={nodeRef}
            onDoubleClick={onDoubleClick}
          >
            {data?.syncing && (
              <>
                <div
                  className={clsx(
                    "h-4 bg-white rounded border border-gray-1 flex items-center justify-center",
                    "cursor-default nodrag absolute -top-2 right-2 text-[10px] gap-1 px-1",
                  )}
                  style={{ borderColor: nodeStyle.borderColor }}
                  data-tooltip-id="syncing"
                  data-tooltip-place="top"
                >
                  Syncing <Loader2 className="animate-spin size-2.5" />
                </div>
                <Tooltip id="syncing">
                  <div className="text-xs w-[180px]">
                    Some features of a node such as the node page or graph are only available after
                    the initial sync
                  </div>
                </Tooltip>
              </>
            )}
            {data?.type && data?.type !== NodeType.Default && (
              <div className="absolute top-0 left-2 text-[10px]">
                {nodeTypeMap[data.type as NodeType]}
              </div>
            )}
            {/* if domain is localhost show the id */}
            {window.location.hostname === "localhost" && (
              <div className="absolute top-0 right-2 text-[10px]">{id.slice(0, 8)}</div>
            )}
            {data?.state && data?.state == "executing" && (
              <div
                className={clsx(
                  "absolute top-[-7px] right-2 flex gap-1",
                  "size-4 bg-white rounded border border-purple flex items-center justify-center",
                  "cursor-pointer nodrag",
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
              className={clsx("w-full items-center justify-center", {
                "nodrag cursor-text h-full overflow-hidden": isEditing,
                [`line-clamp-${lineClamp}`]: !isEditing,
              })}
            />
            <Footer id={id} nodeStyle={nodeStyle} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onExportNode(false)}>Export Node</ContextMenuItem>
          {backendNode?.has_subnodes && (
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
