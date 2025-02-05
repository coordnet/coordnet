import { createContext } from "react";

import { BackendParent, YDocScope } from "@/types";

import { YDocProviderReturn } from "./provider";

export type YDocContextType = {
  parent: BackendParent;
  scope: YDocScope;
  space: YDocProviderReturn;
  canvas: YDocProviderReturn;
  editor: YDocProviderReturn;
};

/**
 * Context for sharing an Y.Docs between components
 */
export const YDocContext = createContext<YDocContextType | undefined>(undefined);
