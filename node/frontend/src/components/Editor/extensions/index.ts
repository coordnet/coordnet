import { HocuspocusProvider } from "@hocuspocus/provider";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";

import { BulletList } from "./BulletList";
import { ListItem } from "./ListItem";
import { Node } from "./Node";

export const loadExtensions = (
  provider?: HocuspocusProvider,
  ydoc?: Y.Doc,
  field = "default",
  readOnly = false
) => {
  const extensions: Extensions = [Link];

  // Register collaboration if set
  if (ydoc) {
    extensions.push(
      StarterKit.configure({ undoRedo: false, bulletList: false, listItem: false, link: false })
    );
    extensions.push(Collaboration.configure({ document: ydoc, field }));
    if (!readOnly && provider) extensions.push(CollaborationCaret.configure({ provider }));

    // Otherwise just add starter kit
  } else {
    extensions.push(StarterKit.configure({ bulletList: false, listItem: false, link: false }));
  }

  extensions.push(Node);
  extensions.push(BulletList);
  extensions.push(ListItem);
  extensions.push(Table.configure({ cellMinWidth: 100, resizable: true }));
  extensions.push(TableRow);
  extensions.push(TableHeader);
  extensions.push(TableCell);

  return extensions;
};
