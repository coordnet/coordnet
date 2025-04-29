import { useParams } from "react-router-dom";

import { SkillsRunnerInput } from "@/types";

import { Dropzone } from "./Dropzone";
import { useFileUpload } from "./hooks/useFileUpload";
import { useTextInput } from "./hooks/useTextInput";
import { InputItem } from "./InputItem";
import { TextInputModal } from "./TextInputModal";

interface InputProps {
  inputs: SkillsRunnerInput[];
  onAddInput: (newInput: SkillsRunnerInput) => void;
  onRemoveInput: (id: string) => void;
}

export const Input = ({ inputs, onAddInput, onRemoveInput }: InputProps) => {
  const { runId } = useParams();
  const isRunActive = Boolean(runId);

  const { fileInputRef, pendingUploads, handleFileChange, handleFileDrop, triggerFileInput } =
    useFileUpload({ onAddInput });

  const { isModalOpen, editingInputId, openModal, closeModal, handleSubmit, editor } = useTextInput(
    { inputs, onAddInput, onRemoveInput }
  );

  const isProcessingFiles = pendingUploads > 0;
  const isDisabled = isRunActive || isProcessingFiles;

  const handleEditInput = (input: SkillsRunnerInput) => {
    if (!isDisabled) {
      openModal(input);
    }
  };

  const handleRemoveInput = (id: string) => {
    onRemoveInput(id);
  };

  return (
    <div className="mx-auto">
      <h2 className="mb-4 text-xl font-semibold text-neutral-400">Input</h2>
      <div>
        <Dropzone
          onFilesSelected={handleFileChange}
          onFileDrop={handleFileDrop}
          onAddTextClick={() => openModal()}
          onTriggerFileInput={triggerFileInput}
          fileInputRef={fileInputRef}
          isDisabled={isDisabled}
          isProcessing={isProcessingFiles}
          pendingUploads={pendingUploads}
          hasInputs={inputs.length > 0}
        />

        {inputs.length > 0 && (
          <div className="mt-4 flex max-h-[204px] w-48 flex-col gap-2 overflow-auto">
            {inputs.map((input) => (
              <InputItem
                key={input.id}
                input={input}
                onRemove={handleRemoveInput}
                onEdit={handleEditInput}
                isRunActive={isRunActive}
                isDisabled={isProcessingFiles}
              />
            ))}
          </div>
        )}

        <TextInputModal
          isOpen={isModalOpen}
          onClose={closeModal}
          editor={editor}
          onSubmit={handleSubmit}
          isEditing={Boolean(editingInputId)}
        />
      </div>
    </div>
  );
};
