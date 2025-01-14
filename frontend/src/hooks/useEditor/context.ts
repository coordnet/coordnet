import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

import { BackendParent } from "@/types";

export type EditorContextType = {
  parent: BackendParent;
  provider: HocuspocusProvider | undefined;
  yDoc: Y.Doc | undefined;
  error: Error | undefined;
  connected: boolean;
  synced: boolean;
};

/**
 * Context for sharing an editor between components
 */
export const EditorContext = createContext<EditorContextType | undefined>(undefined);
