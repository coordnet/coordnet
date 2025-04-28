import React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  setText: (text: string) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({
  isOpen,
  onClose,
  text,
  setText,
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
        <textarea
          className="flex-grow resize-none rounded-md border border-neutral-200 p-2
            focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Type your input here..."
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 font-semibold text-white hover:bg-violet-700"
            onClick={onSubmit}
            disabled={!text.trim()}
          >
            {isEditing ? "Save Changes" : "Add as input"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
