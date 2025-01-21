import { createContext } from "react";

import { BackendParent } from "@/types";

import { YDocProviderReturn } from "./provider";

export type YDocContextType = {
  parent: BackendParent;
  space: YDocProviderReturn;
  canvas: YDocProviderReturn;
  editor: YDocProviderReturn;
};

/**
 * Context for sharing an Y.Docs between components
 */
export const YDocContext = createContext<YDocContextType | undefined>(undefined);
