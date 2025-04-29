import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onSubmit: () => void;
  isEditing: boolean;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({
  isOpen,
  onClose,
  editor,
  onSubmit,
  isEditing,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-[60%] max-h-[600px] w-[90%] max-w-[768px] flex-col rounded-lg shadow-md"
        showCloseButton={true}
        overlayClassName="bg-black/40"
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
      >
        <DialogTitle>{isEditing ? "Edit Input" : "Add Input"}</DialogTitle>
        <DialogDescription className="hidden">Add or edit input text</DialogDescription>
        <EditorContent editor={editor} className="prose max-w-none flex-grow" />
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 font-semibold text-white hover:bg-violet-700"
            onClick={onSubmit}
            disabled={editor?.isEmpty}
          >
            {isEditing ? "Save Changes" : "Add as input"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
