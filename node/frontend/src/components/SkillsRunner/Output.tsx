import { RunStatus } from "@coordnet/core";
import { DialogTitle } from "@radix-ui/react-dialog";
import { EditorContent, JSONContent, useEditor as useEditorTipTap } from "@tiptap/react";
import clsx from "clsx";

import { SkillsRunnerInput } from "@/types";

import { loadExtensions } from "../Editor/extensions";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";

export const Output = ({
  inputs,
  status,
  output,
  error,
  outputModalOpen,
  setOutputModalOpen,
}: {
  inputs: SkillsRunnerInput[];
  status: RunStatus;
  output: JSONContent | undefined;
  error: unknown;
  outputModalOpen: boolean;
  setOutputModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const hasError = inputs.some((i) => i.error);

  const editor = useEditorTipTap(
    {
      immediatelyRender: false,
      content: output,
      extensions: loadExtensions(undefined, undefined, "doc"),
      editable: false,
    },
    [output]
  );

  const modalEditor = useEditorTipTap(
    {
      immediatelyRender: false,
      content: output,
      extensions: loadExtensions(undefined, undefined, "doc"),
      editable: false,
    },
    [output]
  );

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-400">Output</h2>
          {status !== "loading" && (
            <span
              className={`rounded-full border border-neutral-200 px-2 py-1 text-sm capitalize ${
              status === "success" && hasError
                  ? "bg-red-100 text-red-800"
                  : status === "success"
                    ? "bg-green-100 text-green-800"
                    : status === "pending" || status === "running"
                      ? "bg-yellow-100 text-yellow-800"
                      : status === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-white text-gray-800"
              }`}
            >
              {hasError ? "Input error" : status}
            </span>
          )}
        </div>
        <div
          className={clsx(
            "h-52 w-48 flex-shrink-0 rounded-lg border border-dashed border-neutral-400 p-4",
            output && "bg-white"
          )}
        >
          {status === "error" ? (
            <div className="text-red-500">
              <p className="font-semibold">Error:</p>
              <p>{`${error}`}</p>
            </div>
          ) : output ? (
            <div className="flex h-full flex-col gap-4 rounded-lg bg-white">
              <div className="overflow-auto text-sm">
                <EditorContent editor={editor} />
              </div>
              <Button
                className="mt-auto bg-violet-600 py-3 text-sm font-medium text-white
                  hover:bg-violet-700"
                onClick={() => setOutputModalOpen(true)}
              >
                Open Output
              </Button>
            </div>
          ) : (
            <p
              className="flex h-full w-full items-center justify-center text-center
                text-neutral-400"
            >
              Run the skill to generate output
            </p>
          )}
        </div>
      </div>

      <Dialog open={outputModalOpen} onOpenChange={setOutputModalOpen}>
        <DialogContent
          className="flex h-[800px] max-h-[95vh] w-[1200px] max-w-[95vw] flex-col gap-2
            overflow-hidden rounded-lg p-6"
          showCloseButton={false}
          overlayClassName="bg-black/40"
        >
          <DialogTitle className="text-xl font-semibold text-neutral-400">Output</DialogTitle>

          <div className="-mx-2 flex-1 overflow-auto">
            <EditorContent editor={modalEditor} className="prose max-w-none" />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setOutputModalOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-700"
              onClick={() => setOutputModalOpen(false)}
            >
              Copy Output
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
