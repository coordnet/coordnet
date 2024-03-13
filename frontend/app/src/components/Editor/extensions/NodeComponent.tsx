import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";

import { EditableNode } from "@/components";
import useQuickView from "@/hooks/useQuickView";

const NodeComponent = ({ node: pmNode }: { node: ProseMirrorNode }) => {
  const { showQuickView } = useQuickView();

  const id = pmNode.attrs.id;

  return (
    <NodeViewWrapper className="border border-gray-400 p-2 bg-white">
      <div draggable={true} contentEditable={false} className="p-3">
        <div className="text-xs text-gray-500" data-drag-handle>
          Drag
        </div>

        <button onClick={() => showQuickView(id)}>Quick View</button>

        <EditableNode id={id} />
      </div>
    </NodeViewWrapper>
  );
};

export default NodeComponent;
