import { HocuspocusProvider } from "@hocuspocus/provider";
import Collaboration from "@tiptap/extension-collaboration";
import Link from "@tiptap/extension-link";
import { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";

import { BulletList } from "./BulletList";
import { CollaborationCursor } from "./CollaborationCursor";
import { ListItem } from "./ListItem";
import Node from "./Node";

export const loadExtensions = (provider?: HocuspocusProvider, ydoc?: Y.Doc, readOnly = false) => {
  const extensions: Extensions = [Link];

  // Register collaboration if set
  if (ydoc && provider) {
    extensions.push(StarterKit.configure({ history: false, bulletList: false, listItem: false }));
    extensions.push(Collaboration.configure({ document: ydoc }));
    if (!readOnly) extensions.push(CollaborationCursor.configure({ provider }));

    // Otherwise just add starter kit
  } else {
    extensions.push(StarterKit.configure({}));
  }

  extensions.push(Node);
  extensions.push(BulletList);
  extensions.push(ListItem);

  return extensions;
};
