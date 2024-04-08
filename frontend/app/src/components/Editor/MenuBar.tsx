import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import { BubbleMenu, Editor, isTextSelection } from "@tiptap/react";
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
      shouldShow={({ view, state, from, to }) => {
        // Modified original from:
        // https://github.com/ueberdosis/tiptap/blob/063ced27ca55f331960b01ee6aea5623eee0ba49/packages/extension-bubble-menu/src/bubble-menu-plugin.ts#L43
        const { doc, selection } = state;
        const { empty } = selection;

        // Sometime check for `empty` is not enough.
        // Doubleclick an empty paragraph returns a node size of 2.
        // So we check also for an empty text size.
        const isEmptyTextBlock =
          !doc.textBetween(from, to).length && isTextSelection(state.selection);

        if (!view.hasFocus() || empty || isEmptyTextBlock) {
          return false;
        }

        // Disable for embedded nodes
        if (editor.isActive("CoordNode")) return false;

        return true;
      }}
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
