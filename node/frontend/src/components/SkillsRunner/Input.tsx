import clsx from "clsx";
import DOMPurify from "dompurify";
import { FileText, TriangleAlert, Upload, X } from "lucide-react";
import { marked } from "marked";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { convertWithMarkItDown } from "@/api";
import line from "@/assets/line-1.svg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import useWindowDrag from "@/hooks/useWindowDrag";
import { readPdf } from "@/lib/pdfjs";
import { SkillsRunnerInput } from "@/types";

import { getFileTypeInfo } from "./utils";

export const Input = ({
  inputs,
  onAddInput,
  onRemoveInput,
}: {
  inputs: SkillsRunnerInput[];
  onAddInput: (newInput: SkillsRunnerInput) => void;
  onRemoveInput: (id: string) => void;
}) => {
  const { runId } = useParams();

  const [textModalOpen, setTextModalOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useWindowDrag();
  const [uploadStatus, setUploadStatus] = useState<
    Record<
      string,
      {
        status: "pending" | "success" | "error";
        filename: string;
        error?: string;
      }
    >
  >({});

  const hasTextInput = inputs.some((input) => input.type === "text");

  const handleTextSubmit = () => {
    if (manualText.trim()) {
      onAddInput({
        id: crypto.randomUUID(),
        type: "text",
        name: "User Input",
        content: manualText,
      });
      setManualText("");
      setTextModalOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const filesArray = Array.from(files);

    // Create an initial pending status for all files in one go
    const initialStatus: typeof uploadStatus = {};
    filesArray.forEach((file) => {
      const fileId = crypto.randomUUID();
      initialStatus[fileId] = {
        status: "pending",
        filename: file.name,
      };
    });

    setUploadStatus(initialStatus);

    // Process each file
    for (const file of filesArray) {
      const fileId = Object.keys(initialStatus).find(
        (id) => initialStatus[id].filename === file.name
      );
      if (!fileId) continue;

      const fileExtension = file.name.split(".").pop();
      const { type } = getFileTypeInfo(fileExtension);

      try {
        const result = await convertWithMarkItDown(file);

        if (result.status === "success" && result.text_content) {
          const content = DOMPurify.sanitize(result.text_content);
          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              status: "success",
            },
          }));
          onAddInput({
            id: fileId,
            type,
            name: file.name,
            content,
          });
          console.log(content);
        } else {
          throw new Error(result.error || "Conversion failed");
        }
      } catch (error) {
        console.error("Error processing file:", error);

        try {
          let content = "";
          if (fileExtension?.toLowerCase() === "pdf") {
            const arrayBuffer = await file.arrayBuffer();
            content = await readPdf(arrayBuffer);
          } else if (fileExtension?.toLowerCase() === "md") {
            const arrayBuffer = await file.arrayBuffer();
            const markdown = new TextDecoder().decode(arrayBuffer);
            content = DOMPurify.sanitize(await marked.parse(markdown));
          } else if (fileExtension?.toLowerCase() === "txt") {
            const text = await file.text();
            content = DOMPurify.sanitize(text);
          } else {
            throw new Error(`Could not process file: ${file.name}`);
          }

          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], status: "success" },
          }));
          onAddInput({ id: fileId, type, name: file.name, content });
        } catch (fallbackError) {
          console.error(fallbackError);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          setUploadStatus((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], status: "error", error: errorMessage },
          }));
          onAddInput({ id: fileId, type, name: file.name, content: "", error: errorMessage });
        }
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Calculate pending uploads
  const pendingUploads = Object.values(uploadStatus).filter(
    (status) => status.status === "pending"
  ).length;

  // Get acceptable file types
  const acceptableFileTypes =
    ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.htm,.csv,.json,.xml,.epub,.txt,.md";

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-neutral-400">Input</h2>
      <div>
        <div className="flex h-52 items-center justify-center gap-6">
          <div
            className={clsx(
              "flex h-52 w-48 flex-shrink-0 flex-col items-center justify-center gap-3",
              "rounded-lg border border-dashed p-4 transition-colors duration-200",
              !runId && isDragging ? "border-purple bg-purple/10 shadow-lg" : "border-violet-600",
              pendingUploads > 0 && "opacity-70"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (!files.length || runId || pendingUploads > 0) return;
              const changeEvent = {
                target: { files },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileUpload(changeEvent);
            }}
          >
            <div className="text-center text-base font-normal text-neutral-400">
              {pendingUploads > 0
                ? `Processing ${pendingUploads} files...`
                : !runId && isDragging
                  ? "Drop files here"
                  : "Drag & Drop"}
            </div>
            <div className="flex justify-center gap-3">
              <Button
                variant="ghost"
                className={clsx(
                  `flex size-11 items-center justify-center rounded-full bg-violet-600 text-white
                  hover:bg-violet-800 hover:text-white`,
                  inputs.length > 0 &&
                    "hover:text-voilet-800 bg-white text-violet-600 hover:bg-slate-100"
                )}
                data-tooltip-id="skills-runner-upload"
                data-tooltip-place="bottom"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(runId) || pendingUploads > 0}
              >
                <Upload className="size-6" />
              </Button>
              <Tooltip id="skills-runner-upload" className="z-50 max-w-[300px]">
                Upload files (PDF, Word, Excel, PowerPoint, HTML, CSV, JSON, XML, ZIP, EPUB, TXT,
                MD)
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptableFileTypes}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                className={clsx(
                  `flex size-11 items-center justify-center rounded-full bg-violet-600 text-white
                  hover:bg-violet-800 hover:text-white`,
                  inputs.length > 0 &&
                    "hover:text-voilet-800 bg-white text-violet-600 hover:bg-slate-100"
                )}
                data-tooltip-id="skills-runner-text"
                data-tooltip-place="bottom"
                onClick={() => !hasTextInput && setTextModalOpen(true)}
                disabled={Boolean(hasTextInput || runId || pendingUploads > 0)}
                title={
                  pendingUploads > 0
                    ? "Wait for file processing"
                    : hasTextInput
                      ? "Text already added"
                      : "Add text input"
                }
              >
                <FileText className="size-6" />
              </Button>
              <Tooltip id="skills-runner-text">Input text</Tooltip>
            </div>
          </div>
          <img src={line} alt="line" className="flex-shrink-0" />
        </div>

        {inputs.length > 0 && (
          <div className="mt-4 flex max-h-[274px] w-48 flex-col gap-2 overflow-auto">
            {inputs.map((input, i) => {
              const fileExtension = input.name.split(".").pop();
              const { icon } = getFileTypeInfo(fileExtension);

              return (
                <div key={`${input.id}-${i}`}>
                  <div
                    className={clsx(
                      `flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3
                      py-2 text-sm font-medium text-neutral-900`,
                      input.error && "border-red-500 bg-red-50 text-red-500"
                    )}
                    data-tooltip-id={`skills-runner-file-${input.id}`}
                    data-tooltip-place="bottom"
                  >
                    {input.error ? (
                      <TriangleAlert className="size-4 text-red-500" />
                    ) : input.type === "text" ? (
                      <FileText className="size-4 text-green-500" />
                    ) : (
                      icon
                    )}
                    <span className="truncate">
                      {input.type === "text" ? "Text Input" : input.name}
                    </span>
                    {!runId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveInput(input.id)}
                        className="ml-auto h-6 w-6 p-0"
                        disabled={pendingUploads > 0}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  {input.error && (
                    <Tooltip id={`skills-runner-file-${input.id}`} className="max-w-[300px]">
                      {input.error}
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={textModalOpen} onOpenChange={setTextModalOpen}>
          <DialogContent
            className="flex h-[60%] max-h-[600px] w-[90%] max-w-[768px] flex-col rounded-lg
              shadow-md"
            showCloseButton={false}
            overlayClassName="bg-black/40"
          >
            <DialogTitle className="hidden">Add Input</DialogTitle>
            <DialogDescription className="hidden">Add input to the skill</DialogDescription>
            <textarea
              className="flex-grow resize-none bg-white focus:outline-none"
              placeholder="Type your input here..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setTextModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-violet-600 font-semibold hover:bg-violet-700"
                onClick={handleTextSubmit}
              >
                Add as input
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
