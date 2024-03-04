import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import Component from "./NodeComponent";

const CoordNode = Node.create({
  name: "CoordNode",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { id: {} };
  },
  parseHTML() {
    return [{ tag: "coord-node" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["coord-node", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Component);
  },
});

export default CoordNode;
