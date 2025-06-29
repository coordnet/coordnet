import { CanvasNode, NodeType } from "@coordnet/core";
import { Handle, NodeResizer, NodeToolbar, Position } from "@xyflow/react";
import clsx from "clsx";
import { Loader2, LoaderIcon, PlusCircle } from "lucide-react";
import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import pSBC from "shade-blend-color";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { EditableNode } from "@/components";
import { useCanvas, useNodesContext, useQuickView, useUser, useYDoc } from "@/hooks";
import { BackendEntityType } from "@/types";

import { addInputNode } from "../utils";
import BuddySelect from "./BuddySelect";
import Footer from "./Footer";
import HoverMenu from "./HoverMenu";
import NodeError from "./NodeError";
import NodeTypeSelect from "./NodeTypeSelect";
import PaperQACollectionsSelect from "./PaperQACollectionsSelect";

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

const CanvasNodeComponent = ({ id, data, selected }: CanvasNodeComponentProps) => {
  const { runId } = useParams();
  const { isGuest } = useUser();
  const { parent } = useYDoc();
  const { nodesMap: spaceMap } = useNodesContext();
  const { nodesMap, edgesMap, nodeFeatures, inputNodes, nodes } = useCanvas();
  const { showQuickView } = useQuickView();
  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const inputRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lineClamp, setLineClamp] = useState<number>(3);

  const { hasPage, hasCanvas } = nodeFeatures(id);

  const isSkill = parent.type === BackendEntityType.SKILL;
  const isSkillWriter = parent.data?.allowed_actions.includes("write");
  const isInputNode = data?.type === NodeType.Input;
  const canInput = isSkill && isInputNode && !isSkillWriter && !isGuest && !runId;

  useEffect(() => {
    if (!nodeRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setLineClamp(Math.floor((nodeRef?.current?.clientHeight ?? 0) / 20) - 1);
    });
    resizeObserver.observe(nodeRef.current);
    return () => resizeObserver.disconnect();
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
    if (isEditing || data?.syncing || isInputNode) return;
    e.preventDefault();
    if (!hasPage && hasCanvas) showQuickView(id);
    else setNodePage(id);
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

  if (data?.type === NodeType.Input) {
    nodeStyle.borderColor = "rgb(96 165 250)";
    nodeStyle.borderWidth = "2px";
  }
  if (data?.type === NodeType.Output) {
    nodeStyle.borderColor = "rgb(73 222 128)";
    nodeStyle.borderWidth = "2px";
  }

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

      <div
        className={clsx(
          `CanvasNode flex size-full items-center justify-center overflow-hidden rounded-lg border
          border-gray-1 bg-white p-3 text-center text-sm`,
          Boolean(data.borderColor) && "border-2",
          selected && "shadow-node-selected",
          canInput && "border-2 !border-blue-light",
          data.error && "border-red-600 text-red-600"
        )}
        style={nodeStyle}
        ref={nodeRef}
        onDoubleClick={onDoubleClick}
      >
        <NodeError data={data} />
        <BuddySelect id={id} data={data} />
        <NodeTypeSelect id={id} data={data} />
        <PaperQACollectionsSelect id={id} data={data} />

        {canInput && (
          <>
            <div
              className="absolute -top-[11px] size-6 cursor-pointer rounded-full bg-white"
              data-tooltip-id="skill-add-input"
              data-tooltip-place="top"
              onClick={() => addInputNode(nodes, nodesMap, edgesMap, spaceMap, inputNodes)}
            >
              <PlusCircle className="size-6 text-blue-light" />
            </div>
            <Tooltip id="skill-add-input">Add input</Tooltip>
          </>
        )}

        {data?.syncing && (
          <>
            <div
              className={clsx(
                `nodrag absolute -top-2 right-2 flex h-4 cursor-default items-center justify-center
                gap-1 rounded border border-gray-1 bg-white px-1 text-[10px]`
              )}
              style={{ borderColor: nodeStyle.borderColor }}
              data-tooltip-id="syncing"
              data-tooltip-place="top"
            >
              Syncing <Loader2 className="size-2.5 animate-spin" />
            </div>
            <Tooltip id="syncing">
              <div className="w-[180px] text-xs">
                Some features of a node such as the node page or canvas are only available after the
                initial sync
              </div>
            </Tooltip>
          </>
        )}

        {window.location.hostname === "localhost" && (
          <div className="absolute right-2 top-0 text-[10px]">{String(id).slice(0, 8)}</div>
        )}

        {Boolean(data?.state && data?.state == "executing") && (
          <div
            className={clsx(
              `nodrag absolute right-2 top-[-7px] flex size-4 cursor-pointer items-center
              justify-center gap-1 rounded border border-purple bg-white`
            )}
          >
            <LoaderIcon className="size-3 animate-spin text-purple" />
          </div>
        )}

        {data?.type === NodeType.Input ? (
          "Input"
        ) : data?.type === NodeType.Output && spaceMap?.get(id)?.title == "New node" ? (
          "Output"
        ) : (
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
        )}
        <Footer id={id} nodeStyle={nodeStyle} />
      </div>

      <Handle id="target-bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="target-right" type="source" position={Position.Right} style={handleStyle} />
    </>
  );
};

export default CanvasNodeComponent;
