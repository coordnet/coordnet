import { Editor as TipTapEditor, EditorContent } from "@tiptap/react";

import { MenuBar } from "./MenuBar";

const Editor = ({ editor }: { editor: TipTapEditor }) => {
  return (
    <div className="border-gray-300 border">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {/* <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu> */}
    </div>
  );
};

export default Editor;
