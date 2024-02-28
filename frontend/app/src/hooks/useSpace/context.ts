import { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext } from "react";
import * as Y from "yjs";

type SpaceContextType = {
  space: string | undefined;
  nodes: Y.Map<Node> | undefined;
  synced: boolean;
  connected: boolean;
  provider: HocuspocusProvider | undefined;
};

/**
 * Context for sharing space between components
 */
export const SpaceContext = createContext<SpaceContextType | undefined>(undefined);
