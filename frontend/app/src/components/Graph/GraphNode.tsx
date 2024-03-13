import clsx from "clsx";
import { Pencil } from "lucide-react";
import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, NodeToolbar, Position } from "reactflow";
import pSBC from "shade-blend-color";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { GraphNode } from "@/types";

import { EditableNode } from "../";
import HoverMenu from "./HoverMenu";

const handleStyle: CSSProperties = {
  borderWidth: "3px",
  borderColor: "#fff",
  width: 10,
  height: 10,
};

const GraphNodeComponent = ({
  id,
  data,
  selected,
}: {
  id: string;
  data: GraphNode["data"];
  selected: boolean;
}) => {
  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const inputRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lineClamp, setLineClamp] = useState<number>(3);

  useEffect(() => {
    if (!nodeRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setLineClamp(Math.floor((nodeRef?.current?.clientHeight ?? 0) / 20) - 1);
    });
    resizeObserver.observe(nodeRef.current);
    return () => resizeObserver.disconnect(); // clean up
  }, []);

  useEffect(() => {
    if (isFocused === false) {
      setIsEditing(false);

      inputRef?.current?.scrollTo(0, 0);
    }
  }, [isFocused]);

  const onClickEdit = (e: MouseEvent) => {
    e.preventDefault();
    if (isEditing == false) {
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
    }
    setIsEditing(!isEditing);
  };

  const onDoubleClick = () => {
    if (isEditing) return;
    setNodePage(id);
  };

  const nodeStyle: CSSProperties = { background: "", opacity: 1 };
  if (data.borderColor) nodeStyle.borderColor = data.borderColor;
  if (data?.progress)
    nodeStyle.background = `linear-gradient(to right, ${
      data?.borderColor ? pSBC(0.9, data?.borderColor) : "#eeeeee"
    } ${data?.progress}%, white ${data?.progress}%)`;
  if (data?.loading) nodeStyle.opacity = 0.8;

  return (
    <>
      <NodeToolbar
        isVisible={data.forceToolbarVisible || undefined}
        position={data.toolbarPosition}
      >
        <HoverMenu id={id} data={data} />
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
          "GraphNode group border border-node-border rounded-lg p-3 bg-white",
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
        {!isEditing && (
          <button
            onClick={onClickEdit}
            className="hidden group-hover:flex absolute top-2 right-2 rounded border items-center px-2 py-1 bg-white text-xs"
          >
            <Pencil className="size-3 mr-1" /> Edit
          </button>
        )}
        <EditableNode
          id={id}
          ref={inputRef}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          contentEditable={isEditing}
          className={clsx("w-full items-center justify-center", {
            "nodrag cursor-text h-full overflow-hidden": isEditing,
            [`line-clamp-${lineClamp}`]: !isEditing,
          })}
        />
        {Boolean(selected && data?.tokens) && (
          <div className="bg-gray-100 absolute h-4 flex items-center rounded-lg border px-1 py-2 -bottom-2 right-3 text-[10px]">
            {data?.tokens} tokens
          </div>
        )}
      </div>
      <Handle id="target-bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="target-right" type="source" position={Position.Right} style={handleStyle} />
    </>
  );
};

export default GraphNodeComponent;
