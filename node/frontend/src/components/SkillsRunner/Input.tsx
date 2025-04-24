import clsx from "clsx";
import DOMPurify from "dompurify";
import { FileText, TriangleAlert, Upload, X } from "lucide-react";
import { marked } from "marked";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import line from "@/assets/line-1.svg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import useWindowDrag from "@/hooks/useWindowDrag";
import { readPdf } from "@/lib/pdfjs";
import { SkillsRunnerInput, SkillsRunnerInputType } from "@/types";

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

  console.log(inputs);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      try {
        let content = "";
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        let type: SkillsRunnerInputType = "txt";
        if (fileExtension === "pdf") {
          type = "pdf";
          const arrayBuffer = await file.arrayBuffer();
          content = await readPdf(arrayBuffer);
        } else if (fileExtension === "md") {
          type = "md";
          const arrayBuffer = await file.arrayBuffer();
          const markdown = new TextDecoder().decode(arrayBuffer);
          content = DOMPurify.sanitize(await marked.parse(markdown));
        } else if (fileExtension === "txt") {
          type = "txt";
          const text = await file.text();
          content = DOMPurify.sanitize(text);
        } else {
          console.error("Unsupported file type:", fileExtension);
          return;
        }
        onAddInput({ id: crypto.randomUUID(), type, name: file.name, content });
      } catch (error) {
        console.error("Error reading file:", error);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Group inputs by type for display
  const groupedInputs = inputs.reduce(
    (acc, input) => {
      const key =
        input.type === "text"
          ? "text"
          : input.type === "pdf"
            ? "pdf"
            : input.type === "md"
              ? "md"
              : "txt";
      if (!acc[key]) acc[key] = [];
      acc[key].push(input);
      return acc;
    },
    {} as Record<string, SkillsRunnerInput[]>
  );

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-neutral-400">Input</h2>
      <div>
        <div className="flex h-52 items-center justify-center gap-6">
          <div
            className={clsx(
              "flex h-52 w-48 flex-shrink-0 flex-col items-center justify-center gap-3",
              "rounded-lg border border-dashed p-4 transition-colors duration-200",
              !runId && isDragging ? "border-purple bg-purple/10 shadow-lg" : "border-violet-600"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (!files.length || runId) return;
              const changeEvent = {
                target: { files },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileUpload(changeEvent);
            }}
          >
            <div className="text-center text-base font-normal text-neutral-400">
              {!runId && isDragging ? "Drop files here" : "Drag & Drop"}
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
                disabled={Boolean(runId)}
              >
                <Upload className="size-6" />
              </Button>
              <Tooltip id="skills-runner-upload">Upload files (.pdf, .md, .txt)</Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.pdf"
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
                disabled={Boolean(hasTextInput || runId)}
                title={hasTextInput ? "Text already added" : "Add text input"}
              >
                <FileText className="size-6" />
              </Button>
              <Tooltip id="skills-runner-text">Input text</Tooltip>
            </div>
          </div>
          <img src={line} alt="line" className="flex-shrink-0" />
        </div>
        {Object.entries(groupedInputs).length > 0 && (
          <div className="mt-4 flex w-48 flex-col gap-2">
            {Object.entries(groupedInputs).map(([type, items], i) => (
              <div key={`input-file-${type}-${i}`}>
                <div
                  className={clsx(
                    `flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3
                    py-2 text-sm font-medium text-neutral-900`,
                    items.some((item) => item.error) && "border-red-500 bg-red-50 text-red-500"
                  )}
                  data-tooltip-id={`skills-runner-${type}-error`}
                  data-tooltip-place="bottom"
                >
                  {items.some((item) => item.error) ? (
                    <TriangleAlert className="size-4 text-red-500" />
                  ) : (
                    <Upload className="size-4 text-green-500" />
                  )}
                  <span className="truncate">
                    {type === "text"
                      ? "Text added"
                      : `${items.length} .${type.toLowerCase()} ${items.length === 1 ? "file" : "files"} added`}
                  </span>
                  {!runId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => items.forEach((item) => onRemoveInput(item.id))}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                {items.some((item) => item.error) && (
                  <Tooltip id={`skills-runner-${type}-error`} className="max-w-[300px]">
                    {items.map((item) => item.error).join(", ")}
                  </Tooltip>
                )}
              </div>
            ))}
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
