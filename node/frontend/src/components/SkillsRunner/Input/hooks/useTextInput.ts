import { useState } from "react";

import { SkillsRunnerInput } from "@/types";

interface UseTextInputProps {
  inputs: SkillsRunnerInput[];
  onAddInput: (newInput: SkillsRunnerInput) => void;
  onRemoveInput: (id: string) => void;
}

export function useTextInput({ onAddInput, onRemoveInput }: UseTextInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [editingInputId, setEditingInputId] = useState<string | null>(null);

  const openModal = (inputToEdit?: SkillsRunnerInput) => {
    if (inputToEdit) {
      setText(inputToEdit.content);
      setEditingInputId(inputToEdit.id);
    } else {
      setText("");
      setEditingInputId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setText("");
    setEditingInputId(null);
  };

  const handleSubmit = () => {
    if (text.trim()) {
      const name = text.replace(/\n/g, " ");
      const maxLength = 20;
      const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + "..." : name;

      if (editingInputId) {
        // Remove the old one first to maintain order potentially, or update in place if needed
        onRemoveInput(editingInputId);
        onAddInput({
          id: editingInputId,
          type: "text",
          name: `User Input "${truncatedName}"`,
          content: text,
        });
      } else {
        onAddInput({
          id: crypto.randomUUID(),
          type: "text",
          name: `User Input "${truncatedName}"`,
          content: text,
        });
      }
      closeModal();
    }
  };

  return {
    isModalOpen,
    text,
    editingInputId,
    setText,
    openModal,
    closeModal,
    handleSubmit,
  };
}
