import clsx from "clsx";
import { FileText, Upload } from "lucide-react";
import React from "react";
import { Tooltip } from "react-tooltip";

import line from "@/assets/line-1.svg";
import { Button } from "@/components/ui/button";
import useWindowDrag from "@/hooks/useWindowDrag";

const acceptableFileTypes =
  ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.htm,.csv,.json,.xml,.epub,.txt,.md";

interface DropzoneProps {
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onAddTextClick: () => void;
  onTriggerFileInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDisabled: boolean;
  isProcessing: boolean;
  pendingUploads: number;
  hasInputs: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onFileDrop,
  onAddTextClick,
  onTriggerFileInput,
  fileInputRef,
  isDisabled,
  isProcessing,
  pendingUploads,
  hasInputs,
}) => {
  const isDragging = useWindowDrag();

  return (
    <div className="flex items-center justify-center gap-6 md:h-52">
      <div
        className={clsx(
          "flex w-48 flex-shrink-0 flex-col items-center justify-center gap-3 md:h-52",
          "rounded-lg border border-dashed p-4 transition-colors duration-200",
          !isDisabled && isDragging ? "border-purple bg-purple/10 shadow-lg" : "border-violet-600",
          isProcessing && "cursor-not-allowed opacity-70"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={!isDisabled ? onFileDrop : (e) => e.preventDefault()}
      >
        <div className="text-center text-base font-normal text-neutral-400">
          {pendingUploads > 0
            ? `Processing ${pendingUploads} file${pendingUploads > 1 ? "s" : ""}...`
            : !isDisabled && isDragging
              ? "Drop files here"
              : "Drag & Drop"}
        </div>
        <div className="flex justify-center gap-3">
          {/* Upload Button */}
          <Button
            variant="ghost"
            className={clsx(
              `flex size-11 items-center justify-center rounded-full text-white
              hover:text-violet-600`,
              hasInputs
                ? "bg-white text-violet-600 hover:bg-slate-100"
                : "bg-violet-600 hover:bg-violet-800",
              isDisabled && "cursor-not-allowed opacity-50"
            )}
            data-tooltip-id="skills-runner-upload"
            data-tooltip-place="bottom"
            onClick={onTriggerFileInput}
            disabled={isDisabled}
            aria-label="Upload files"
          >
            <Upload className="size-6" />
          </Button>
          <Tooltip id="skills-runner-upload" className="z-50 max-w-[300px]">
            Upload files ({acceptableFileTypes.replace(/\./g, "").replace(/,/g, ", ")})
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptableFileTypes}
            onChange={onFilesSelected}
            className="hidden"
            disabled={isDisabled}
          />

          {/* Text Input Button */}
          <Button
            variant="ghost"
            className={clsx(
              `flex size-11 items-center justify-center rounded-full text-white
              hover:text-violet-600`,
              hasInputs
                ? "bg-white text-violet-600 hover:bg-slate-100"
                : "bg-violet-600 hover:bg-violet-800",
              isDisabled && "cursor-not-allowed opacity-50"
            )}
            data-tooltip-id="skills-runner-text"
            data-tooltip-place="bottom"
            onClick={onAddTextClick}
            disabled={isDisabled}
            title={isProcessing ? "Wait for file processing" : "Add text input"}
            aria-label="Add text input"
          >
            <FileText className="size-6" />
          </Button>
          <Tooltip id="skills-runner-text">Input text</Tooltip>
        </div>
      </div>
      <img src={line} alt="" className="hidden flex-shrink-0 md:block" aria-hidden="true" />
    </div>
  );
};
