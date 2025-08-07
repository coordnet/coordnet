import React from "react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import clsx from "clsx";
import { GripIcon } from "lucide-react";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { EditableNode } from "@/components";

const NodeComponent = ({
  node: pmNode,
  selected,
}: {
  node: ProseMirrorNode;
  selected: boolean;
}) => {
  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const id = pmNode.attrs.id;

  return (
    <NodeViewWrapper className={clsx()}>
      <div
        className={clsx(
          "CanvasNode relative rounded-lg border border-gray-1 p-1",
          "flex w-1/2 items-center justify-center text-center text-sm",
          { "shadow-node-selected": selected }
        )}
        onDoubleClick={() => setNodePage(id)}
      >
        <div draggable={true} contentEditable={false} className="p-3">
          <div className="absolute left-2 top-2 cursor-grab select-none" data-drag-handle>
            <GripIcon className="size-3 text-gray-4" />
          </div>
          <EditableNode id={id} contentEditable={false} className="line-clamp-3" />
          {/* TODO: Fix this */}
          {/* <Footer id={id} nodeStyle={{}} /> */}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default NodeComponent;
