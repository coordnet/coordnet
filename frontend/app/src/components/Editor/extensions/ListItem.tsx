import { mergeAttributes, Node } from "@tiptap/core";

export interface ListItemOptions {
  HTMLAttributes: Record<string, unknown>;
  bulletListTypeName: string;
  orderedListTypeName: string;
}

export const ListItem = Node.create<ListItemOptions>({
  name: "listItem",

  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: "bulletList",
      orderedListTypeName: "orderedList",
    };
  },

  content: "paragraph block*",

  defining: true,

  draggable: true,

  parseHTML() {
    return [
      {
        tag: "li",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { draggable: true }),
      ["div", { class: "content-wrapper" }, 0],
      ["div", { class: "draggable-handle" }, ["div", { class: "handle" }, ""]],
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("li");
      dom.setAttribute("draggable", "true");

      const contentDOM = document.createElement("div");
      contentDOM.classList.add("content-wrapper");

      const handle = document.createElement("div");
      handle.classList.add("draggable-handle");

      const innerDiv = document.createElement("div");
      innerDiv.classList.add("handle");

      handle.appendChild(innerDiv);
      dom.appendChild(handle);
      dom.appendChild(contentDOM);

      let target: EventTarget | null = null;

      dom.onmousedown = function (e) {
        target = e.target;
      };

      dom.ondragstart = function (e) {
        if (target instanceof Element && !handle.contains(target)) {
          e.preventDefault();
        }
      };

      dom.addEventListener("dragend", () => {
        dom.classList.remove("dragging");
      });

      return { dom, contentDOM };
    };
  },
});
