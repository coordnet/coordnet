import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import { BubbleMenu, Editor } from "@tiptap/react";
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
      className="flex"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "is-active" : ""}
      >
        B{/* <FontAwesomeIcon icon={editor.isActive("bold") ? faBoldSolid : faBold} size="sm" /> */}
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "is-active" : ""}
      >
        I
        {/* <FontAwesomeIcon icon={editor.isActive("italic") ? faItalicSolid : faItalic} size="sm" /> */}
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive("strike") ? "is-active" : ""}
      >
        S
        {/* <FontAwesomeIcon
          icon={editor.isActive("strike") ? faStrikethroughSolid : faStrikethrough}
          size="sm"
        /> */}
      </button>
      <div className="px-2">|</div>

      <button onClick={setLink} className={editor.isActive("link") ? "is-active" : ""}>
        {/* <FontAwesomeIcon icon={faLink} size="sm" /> */}
        Link
      </button>
      <button
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
      >
        {/* <FontAwesomeIcon icon={faUnlink} size="sm" /> */}
        Remove Link
      </button>
      <div className="px-2">|</div>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
        {/* <FontAwesomeIcon icon={faH1} size="sm" /> */}
        H1
      </button>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        {/* <FontAwesomeIcon icon={faH2} size="sm" /> */}
        H2
      </button>
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
        {/* <FontAwesomeIcon icon={faH3} size="sm" /> */}
        H3
      </button>
      <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        {/* <FontAwesomeIcon icon={faList} size="sm" /> */}
        List
      </button>
    </BubbleMenu>
  );
};
