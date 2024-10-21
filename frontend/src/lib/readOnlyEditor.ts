import { Editor } from "@tiptap/react";

import { loadExtensions } from "@/components/Editor/extensions";

const extensions = loadExtensions(undefined, undefined, true);
const readOnlyEditor = new Editor({
  editable: false,
  extensions,
  editorProps: { attributes: { class: "prose focus:outline-none" } },
});

export { extensions, readOnlyEditor };
