import { useEditor as useEditorTipTap } from "@tiptap/react";
import { useState } from "react";

import { loadExtensions } from "@/components/Editor/extensions";
import { SkillsRunnerInput } from "@/types";

interface UseTextInputProps {
  inputs: SkillsRunnerInput[];
  onAddInput: (newInput: SkillsRunnerInput) => void;
  onRemoveInput: (id: string) => void;
}

export function useTextInput({ onAddInput, onRemoveInput }: UseTextInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInputId, setEditingInputId] = useState<string | null>(null);

  const editor = useEditorTipTap({
    immediatelyRender: false,
    extensions: loadExtensions(undefined, undefined, "doc"),
  });

  const openModal = (inputToEdit?: SkillsRunnerInput) => {
    if (inputToEdit) {
      editor?.commands.setContent(inputToEdit.content);
      setEditingInputId(inputToEdit.id);
    } else {
      editor?.commands.clearContent();
      setEditingInputId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    editor?.commands.clearContent();
    setEditingInputId(null);
  };

  const handleSubmit = () => {
    const text = editor?.getText();
    const content = editor?.getJSON();
    if (text?.trim() && content) {
      const name = text.replace(/\n/g, " ");
      const maxLength = 20;
      const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + "..." : name;

      if (editingInputId) {
        onRemoveInput(editingInputId);
        onAddInput({
          id: editingInputId,
          type: "text",
          name: `User Input "${truncatedName}"`,
          content,
        });
      } else {
        onAddInput({
          id: crypto.randomUUID(),
          type: "text",
          name: `User Input "${truncatedName}"`,
          content,
        });
      }
      closeModal();
    }
  };

  return {
    isModalOpen,
    editingInputId,
    openModal,
    closeModal,
    handleSubmit,
    editor,
  };
}
