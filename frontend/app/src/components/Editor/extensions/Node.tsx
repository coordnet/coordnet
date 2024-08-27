import { mergeAttributes, Node as TipTapNode } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import Component from "./NodeComponent";

export const Node = TipTapNode.create({
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
