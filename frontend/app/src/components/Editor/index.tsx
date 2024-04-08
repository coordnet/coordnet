import { EditorContent, useEditor } from "@tiptap/react";
import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { EditableNode } from "@/components";
import { useFocus } from "@/hooks";
import useNode from "@/hooks/useNode";

import { Button } from "../ui/button";
import { loadExtensions } from "./extensions";
import { MenuBar } from "./MenuBar";

type EditorProps = { id: string; className?: string };

const Editor = ({ id, className }: EditorProps) => {
  const { synced, editorYdoc, editorProvider } = useNode();
  const { setEditor, setFocus, focus, setNodeRepositoryVisible } = useFocus();

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
        <div className="absolute top-2 right-2 flex gap-2 z-20">
          <Button
            variant="outline"
            className="size-9 p-0 shadow"
            onClick={() => setNodeRepositoryVisible(true)}
            draggable
            data-tooltip-id="node-page-repo"
            data-tooltip-place="bottom-end"
            disabled={focus !== "editor"}
          >
            <Search strokeWidth={2.8} className="text-neutral-600 size-4" />
          </Button>
          <Tooltip id="node-page-repo">Node Repository</Tooltip>
          <Button
            variant="outline"
            className="size-9 p-0 shadow"
            onClick={() => setNodePage("")}
            draggable
            data-tooltip-id="node-page-close"
            data-tooltip-place="bottom-end"
          >
            <X strokeWidth={2.8} className="text-neutral-600 size-4" />
          </Button>
          <Tooltip id="node-page-close">Add Node</Tooltip>
        </div>
        <MenuBar editor={editor} />
        <EditorContent className="h-full w-full" editor={editor} />
        {/* <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu> */}
      </div>
    </div>
  );
};

export default Editor;
