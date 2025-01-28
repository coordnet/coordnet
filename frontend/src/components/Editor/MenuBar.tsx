import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

import { BubbleMenu, Editor, isTextSelection } from "@tiptap/react";
import {
  BetweenHorizonalEnd,
  BetweenHorizonalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Grid2x2X,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  RemoveFormatting,
  Strikethrough,
  TableCellsMerge,
  TableColumnsSplit,
  TableRowsSplit,
} from "lucide-react";
import { useCallback } from "react";
import { Tooltip } from "react-tooltip";

export const MenuBar = ({ editor }: { editor?: Editor | null }) => {
  const setLink = useCallback(() => {
    if (!editor) {
      return null;
    }

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // Cancelled
    if (url === null) {
      return;
    }

    // Empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  // Determine if the current selection is inside a table
  const isInTable =
    editor.isActive("table") ||
    editor.isActive("tableRow") ||
    editor.isActive("tableCell") ||
    editor.isActive("tableHeader");

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        theme: "light-border",
        maxWidth: 1000,
      }}
      className="flex flex-col gap-2"
      shouldShow={({ view, state, from, to }) => {
        const { doc, selection } = state;
        const { empty } = selection;

        // Sometimes checking for `empty` is not enough.
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
      {/* Text Formatting buttons */}
      <div className="flex gap-3">
        <button onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" strokeWidth={editor.isActive("bold") ? 3 : 2.5} />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" strokeWidth={editor.isActive("italic") ? 3 : 2.5} />
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="size-4" strokeWidth={editor.isActive("strike") ? 3 : 2.5} />
        </button>

        <div className="px-1 text-slate-400">|</div>

        <button
          onClick={() =>
            editor.isActive("link") ? editor.chain().focus().unsetLink().run() : setLink()
          }
        >
          {editor.isActive("link") ? <Link2Off className="size-4" /> : <Link2 className="size-4" />}
        </button>

        <div className="px-1 text-slate-400">|</div>

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
      </div>

      {/* Conditionally Render Table Manipulation buttons */}
      {isInTable && (
        <div className="mt-0 flex flex-wrap gap-3 border-t pt-2">
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={!editor.can().addColumnBefore()}
            data-tooltip-id="add-column-before"
            data-tooltip-place="bottom-start"
          >
            <BetweenVerticalStart className="size-4" />
          </button>
          <Tooltip id="add-column-before">Add Column Before</Tooltip>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().addColumnAfter()}
            data-tooltip-id="add-column-after"
            data-tooltip-place="bottom-start"
          >
            <BetweenVerticalEnd className="size-4" />
          </button>
          <Tooltip id="add-column-after">Add Column After</Tooltip>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().deleteColumn()}
            data-tooltip-id="delete-column"
            data-tooltip-place="bottom-start"
          >
            <TableColumnsSplit className="size-4" />
          </button>
          <Tooltip id="delete-column">Delete Column</Tooltip>
          <div className="px-1 text-slate-400">|</div>
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={!editor.can().addRowBefore()}
            data-tooltip-id="add-row-before"
            data-tooltip-place="bottom-start"
          >
            <BetweenHorizonalStart className="size-4" />
          </button>
          <Tooltip id="add-row-before">Add Row Before</Tooltip>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().addRowAfter()}
            data-tooltip-id="add-row-after"
            data-tooltip-place="bottom-start"
          >
            <BetweenHorizonalEnd className="size-4" />
          </button>
          <Tooltip id="add-row-after">Add Row After</Tooltip>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().deleteRow()}
            data-tooltip-id="delete-row"
            data-tooltip-place="bottom-start"
          >
            <TableRowsSplit className="size-4" />
          </button>
          <Tooltip id="delete-row">Delete Row</Tooltip>
          <div className="px-1 text-slate-400">|</div>
          <button
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            disabled={!editor.can().mergeOrSplit()}
            data-tooltip-id="merge-or-split"
            data-tooltip-place="bottom-start"
          >
            <TableCellsMerge className="size-4" />
          </button>
          <Tooltip id="merge-or-split">Merge/Split Cells</Tooltip>
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            data-tooltip-id="delete-table"
            data-tooltip-place="bottom-start"
          >
            <Grid2x2X className="size-4" />
          </button>
          <Tooltip id="delete-table">Delete Table</Tooltip>

          {/* <Button
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          disabled={!editor.can().toggleHeaderColumn()}
        >
          Toggle header column
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!editor.can().toggleHeaderRow()}
        >
          Toggle header row
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeaderCell().run()}
          disabled={!editor.can().toggleHeaderCell()}
        >
          Toggle header cell
        </Button> */}
        </div>
      )}
    </BubbleMenu>
  );
};
