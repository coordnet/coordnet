import { EditorContent, useEditor } from "@tiptap/react";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect } from "react";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { EditableNode } from "@/components";
import { useFocus } from "@/hooks";
import useNode from "@/hooks/useNode";

import { loadExtensions } from "./extensions";
import { MenuBar } from "./MenuBar";

type EditorProps = { id: string; className?: string };

const Editor = ({ id, className }: EditorProps) => {
  const { synced, editorYdoc, editorProvider } = useNode();
  const { setEditor, setFocus } = useFocus();

  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const editor = useEditor(
    {
      extensions: loadExtensions(editorProvider, editorYdoc),
      onFocus: () => setFocus("editor"),
      editorProps: { attributes: { class: "prose focus:outline-none" } },
    },
    [id],
  );

  useEffect(() => {
    if (!editor || !synced || !editorYdoc) return;
    // editor.commands.setContent(`<coord-node id="node-2"></coord-node><br/>Hey`);
    setEditor(editor);
  }, [editor, synced, editorYdoc, setEditor]);

  if (!id) return <></>;

  return (
    <div className={clsx("border-gray-300 border-l overflow-auto", className)}>
      <div className="pb-12">
        <div className="p-3 font-medium text-lg mr-4">
          <EditableNode id={id} className="w-full" />
        </div>
        <div className="absolute top-2 right-2 cursor-pointer" onClick={() => setNodePage("")}>
          <X />
        </div>
        <MenuBar editor={editor} />
        <EditorContent className="h-full w-full" editor={editor} />
        {/* <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu> */}
      </div>
    </div>
  );
};

export default Editor;
