import { useQuery } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import clsx from "clsx";
import { History, Search, X } from "lucide-react";
import { useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { format as formatTimeAgo } from "timeago.js";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { getNodeVersions } from "@/api";
import { EditableNode, Loader } from "@/components";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useFocus } from "@/hooks";
import useNode from "@/hooks/useNode";

import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import { loadExtensions } from "./extensions";
import { MenuBar } from "./MenuBar";
import Versions from "./Versions";

type EditorProps = { id: string; className?: string };

const Editor = ({ id, className }: EditorProps) => {
  const { editorError, editorSynced, editorYdoc, editorProvider, node } = useNode();
  const { setEditor, setFocus, focus, setNodeRepositoryVisible } = useFocus();

  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const { data: versions } = useQuery({
    queryKey: ["page-versions", id, "EDITOR", 1],
    queryFn: ({ signal }) => getNodeVersions(signal, id, "EDITOR", 1),
    enabled: Boolean(id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const editor = useEditor(
    {
      extensions: loadExtensions(editorProvider, editorYdoc),
      onFocus: () => setFocus("editor"),
      editorProps: { attributes: { class: "prose focus:outline-none" } },
      editable: node?.allowed_actions.includes("write"),
    },
    [id, node],
  );

  useEffect(() => {
    if (!editor || !editorSynced || !editorYdoc) return;
    // editor.commands.setContent(`<coord-node id="node-2"></coord-node><br/>Hey`);
    setEditor(editor);
  }, [editor, editorSynced, editorYdoc, setEditor]);

  if (!id) return <></>;

  return (
    <div className={clsx("border-gray-300 border-l overflow-hidden flex flex-col", className)}>
      {editorError && <ErrorPage error={editorError} className="absolute z-40 bg-white" />}
      {!editorSynced && <Loader message="Loading editor..." className="absolute z-30" />}
      <div className="p-3 font-medium text-lg mr-24">
        <EditableNode id={id} className="w-full" />
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
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
          className="size-9 p-0 shadow z-40"
          onClick={() => setNodePage("")}
          draggable
          data-tooltip-id="node-page-close"
          data-tooltip-place="bottom-end"
        >
          <X strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="node-page-close">Add Node</Tooltip>
      </div>
      <div className="mb-12 overflow-auto">
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
        {/* <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu> */}
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {Boolean(versions?.results?.length) && (
          <div className="text-xs text-gray-700 ml-2">
            Saved {formatTimeAgo(versions.results[0].created_at)}
          </div>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="size-9 p-0" variant="outline">
              <History className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-4/5 max-w-4/5 h-4/5 max-h-4/5 overflow-hidden">
            <Versions editor={editor} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Editor;
