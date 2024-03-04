import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import useQuickView from "@/hooks/useQuickView";
import useSpace from "@/hooks/useSpace";

const NodeComponent = ({ node: pmNode }: { node: ProseMirrorNode }) => {
  const { nodes, nodesMap } = useSpace();
  const { showQuickView } = useQuickView();

  const id = pmNode.attrs.id;
  const node = useMemo(() => nodes?.find((n) => n.id === id), [nodes, id]);

  const defaultValue = useRef(node?.title);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node?.title === inputRef.current?.innerHTML || !inputRef.current) return;
    inputRef.current.innerHTML = node?.title ?? "";
  }, [inputRef, node, id]);

  const onInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      nodesMap?.set(id, { id: id, title: e.currentTarget.innerHTML });
    },
    [nodesMap, id],
  );

  return (
    <NodeViewWrapper className="border border-gray-400 p-2 bg-white">
      <div draggable={true} contentEditable={false} className="p-3">
        <div className="text-xs text-gray-500" data-drag-handle>
          Drag
        </div>

        <button onClick={() => showQuickView(id)}>Quick View</button>

        <div
          ref={inputRef}
          onInput={onInput}
          contentEditable={true}
          dangerouslySetInnerHTML={{ __html: defaultValue.current ?? "" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
            if (e.metaKey && e.key === "a" && inputRef.current) {
              e.preventDefault();
              const range = document.createRange();
              range.selectNodeContents(inputRef.current);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }}
        />
      </div>
    </NodeViewWrapper>
  );
};

export default NodeComponent;
