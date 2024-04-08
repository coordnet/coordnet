import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import { BubbleMenu, Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  RemoveFormatting,
  Strikethrough,
} from "lucide-react";
import { useCallback } from "react";

export const MenuBar = ({ editor }: { editor?: Editor | null }) => {
  const setLink = useCallback(() => {
    if (!editor) {
      return null;
    }

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        theme: "light-border",
        maxWidth: 1000,
      }}
      className="flex gap-2"
    >
      <button onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" strokeWidth={editor.isActive("bold") ? 3 : 2.5} />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" strokeWidth={editor.isActive("italic") ? 3 : 2.5} />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" strokeWidth={editor.isActive("strike") ? 3 : 2.5} />
      </button>

      <div className="text-slate-400 px-1">|</div>

      <button
        onClick={() =>
          editor.isActive("link") ? editor.chain().focus().unsetLink().run() : setLink()
        }
      >
        {editor.isActive("link") ? <Link2Off className="size-4" /> : <Link2 className="size-4" />}
      </button>

      <div className="text-slate-400 px-1">|</div>

      <button onClick={() => editor?.chain().focus().setParagraph().run()}>
        <RemoveFormatting className="size-4" />
      </button>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-4" />
      </button>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </button>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </button>
      <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </button>
    </BubbleMenu>
  );
};
