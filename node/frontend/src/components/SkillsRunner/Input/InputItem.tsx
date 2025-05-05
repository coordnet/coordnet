import clsx from "clsx";
import { FileText, TriangleAlert, X } from "lucide-react";
import React from "react";
import { Tooltip } from "react-tooltip";

import { Button } from "@/components/ui/button";
import { SkillsRunnerInput } from "@/types";

import { getFileTypeInfo } from "../utils";

interface InputItemProps {
  input: SkillsRunnerInput;
  onRemove: (id: string) => void;
  onEdit: (input: SkillsRunnerInput) => void;
  isRunActive: boolean;
  isDisabled: boolean;
}

export const InputItem: React.FC<InputItemProps> = ({
  input,
  onRemove,
  onEdit,
  isRunActive,
  isDisabled,
}) => {
  const fileExtension = input.name.split(".").pop();
  const { icon } = getFileTypeInfo(fileExtension);
  const isText = input.type === "text";
  const canEdit = isText && !isRunActive && !isDisabled;

  const handleEditClick = () => {
    if (canEdit) {
      onEdit(input);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRunActive && !isDisabled) {
      onRemove(input.id);
    }
  };

  return (
    <div key={input.id}>
      <div
        className={clsx(
          `flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm
          font-medium text-neutral-900`,
          input.error && "border-red-500 bg-red-50 text-red-500",
          canEdit && "cursor-pointer hover:bg-slate-100"
        )}
        data-tooltip-id={`skills-runner-file-${input.id}`}
        data-tooltip-place="bottom"
        onClick={handleEditClick}
        title={canEdit ? `Edit: ${input.name}` : input.name}
      >
        {input.error ? (
          <TriangleAlert className="size-4 shrink-0 text-red-500" />
        ) : isText ? (
          <FileText className="size-4 shrink-0 text-green-500" />
        ) : (
          icon
        )}
        <span className="mr-1 flex-grow truncate">{input.name}</span>
        {!isRunActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveClick}
            className="ml-auto h-6 w-6 flex-shrink-0 rounded-full p-0 hover:bg-neutral-200"
            disabled={isDisabled}
            aria-label={`Remove ${input.name}`}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Tooltip for error messages */}
      {input.error && (
        <Tooltip id={`skills-runner-file-${input.id}`} className="z-50 max-w-[300px]">
          {input.error}
        </Tooltip>
      )}
    </div>
  );
};
