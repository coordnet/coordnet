import { useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position } from "reactflow";

import useSpace from "@/hooks/useSpace";
import { GraphNode } from "@/types";

const handleStyle = { left: 10 };

const GraphNodeComponent = ({ id, data }: { id: string; data: GraphNode["data"] }) => {
  const { nodes, nodesMap } = useSpace();
  const inputRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const node = nodes?.find((n) => n.id === data.label);

  useEffect(() => {
    if (!inputRef.current || isFocused) return;
    inputRef.current.innerHTML = node?.title ?? "";
  }, [inputRef, node]);

  useEffect(() => {
    const node = nodes?.find((n) => n.id === id);
    if (node?.title === inputRef.current?.innerHTML || !inputRef.current) return;
    inputRef.current.innerHTML = node?.title ?? "";
  }, [inputRef, nodes, id]);

  const onInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      nodesMap?.set(id, { id: id, title: e.currentTarget.innerHTML });
    },
    [nodesMap, id],
  );

  return (
    <>
      <Handle type="target" position={Position.Top} />

      <div
        contentEditable
        onInput={onInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        ref={inputRef}
        className="nodrag cursor-text"
      ></div>
      {/* <input
        id="text"
        name="text"
        onChange={onChange}
        value={node?.title}
        className="nodrag text-black"
      /> */}
      <Handle type="source" position={Position.Bottom} id="a" />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
    </>
  );
};

export default GraphNodeComponent;
