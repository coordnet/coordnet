import { useQuery } from "@tanstack/react-query";
import { EditorContent, useEditor as useEditorTipTap } from "@tiptap/react";
import * as blockies from "blockies-ts";
import clsx from "clsx";
import ColorThief from "colorthief";
import { History, Search, Table, X } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { format as formatTimeAgo } from "timeago.js";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { getNodeVersions } from "@/api";
import { EditableNode, Loader } from "@/components";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useFocus, useUser, useYDoc } from "@/hooks";
import { rgbToHex } from "@/lib/utils";
import { BackendEntityType } from "@/types";

import ErrorPage from "../ErrorPage";
import { Button } from "../ui/button";
import { loadExtensions } from "./extensions";
import { MenuBar } from "./MenuBar";
import Versions from "./Versions";

const colorThief = new ColorThief();

type EditorProps = { id: string; className?: string };

const Editor = ({ id, className }: EditorProps) => {
  const { runId } = useParams();
  const {
    parent,
    editor: { error, synced, YDoc, provider },
  } = useYDoc();
  const { user, isGuest } = useUser();
  const { setEditor, setFocus, focus, setNodeRepositoryVisible } = useFocus();

  const [, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const { data: versions } = useQuery({
    queryKey: ["page-versions", id, "EDITOR", "latest"],
    queryFn: ({ signal }) => getNodeVersions(signal, id, "EDITOR", 0, 1),
    enabled: Boolean(id && parent.type === BackendEntityType.SPACE),
    initialData: { count: 0, next: "", previous: "", results: [] },
    refetchInterval: 1000 * 60,
    retry: false,
  });

  const field = parent.type === BackendEntityType.SPACE ? "default" : `${id}-document`;

  const editor = useEditorTipTap(
    {
      immediatelyRender: false,
      extensions: loadExtensions(provider, YDoc, field, parent.type == BackendEntityType.SKILL),
      onFocus: () => setFocus("editor"),
      editorProps: { attributes: { class: "prose focus:outline-none" } },
      editable: Boolean(!runId && parent.data?.allowed_actions.includes("write")),
    },
    [id, parent.data?.allowed_actions, synced]
  );

  useEffect(() => {
    if (!editor || !synced || !YDoc) return;
    // editor.commands.setContent(`<coord-node id="node-2"></coord-node><br/>Hey`);
    setEditor(editor);
  }, [editor, synced, YDoc, setEditor]);

  useEffect(() => {
    if (user && editor && editor.commands.updateUser) {
      const image = blockies.create({ seed: user?.profile }).toDataURL();
      const img = document.createElement("img");
      img.src = image;
      img.addEventListener("load", function () {
        const [r, g, b] = colorThief.getColor(img);
        editor.commands.updateUser({
          displayName: user?.name || user?.email,
          image: image,
          color: rgbToHex(r, g, b),
        });
      });
    }
  }, [user, editor]);

  if (!id) return <></>;

  return (
    <div className={clsx("flex flex-col overflow-hidden border-l border-gray-300", className)}>
      {error && <ErrorPage error={error} className="absolute z-40 bg-white" />}
      {!synced && <Loader message="Loading editor..." className="absolute z-30" />}
      <div className="mr-24 p-3 text-lg font-medium">
        <EditableNode id={id} className="w-full" />
      </div>
      <div className="absolute right-2 top-2 flex gap-2">
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          draggable
          data-tooltip-id="insert-table"
          data-tooltip-place="bottom-end"
          disabled={focus !== "editor"}
        >
          <Table strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="insert-table">Insert Table</Tooltip>
        <Button
          variant="outline"
          className="size-9 p-0 shadow"
          onClick={() => setNodeRepositoryVisible(true)}
          draggable
          data-tooltip-id="node-page-repo"
          data-tooltip-place="bottom-end"
          disabled={focus !== "editor"}
        >
          <Search strokeWidth={2.8} className="size-4 text-neutral-600" />
        </Button>
        <Tooltip id="node-page-repo">Node Repository</Tooltip>
        <Button
          variant="outline"
          className="z-40 size-9 p-0 shadow"
          onClick={() => setNodePage("")}
          draggable
          data-tooltip-id="node-page-close"
          data-tooltip-place="bottom-end"
        >
          <X strokeWidth={2.8} className="size-4 text-neutral-600" />
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
          <div className="ml-2 text-xs text-gray-700">
            Saved {formatTimeAgo(versions.results[0].created_at)}
          </div>
        )}
        {!isGuest && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="size-9 p-0" variant="outline">
                <History className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4/5 max-h-4/5 h-4/5 w-4/5 overflow-hidden">
              <Versions editor={editor} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default Editor;
