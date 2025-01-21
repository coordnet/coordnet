import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";
import * as Y from "yjs";

import { addMethodRunToYdoc, loadDisconnectedDoc } from "@/components/Methods/utils";
import { BackendEntityType } from "@/types";

import useBackendParent from "../useBackendParent";
import useConnectedDocument from "../useConnectedDocument";
import useUser from "../useUser";
import { YDocContext } from "./context";

export type YDocProviderReturn = {
  YDoc: Y.Doc;
  synced: boolean;
  connected: boolean;
  error: Error | undefined;
  provider: HocuspocusProvider | undefined;
  create: (name: string) => () => void;
  reset: () => void;
  setYDoc: React.Dispatch<React.SetStateAction<Y.Doc>>;
  setSynced: React.Dispatch<React.SetStateAction<boolean>>;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>;
};

/**
 * Provider for sharing Y.Docs between components
 */
export function YDocProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, methodId, runId, pageId } = useParams();
  const { token } = useUser();
  const [nodePage] = useQueryParam<string>("nodePage");
  const parent = useBackendParent();

  /*
  Methods:
    Load one document, either
      - Method edit view (Connected Y.Doc)
      - Method new run view (Disconnected Y.Doc)
      - Method run view (Run JSON loaded into Y.Doc)
  Spaces:
    Load three documents
      - Space doc
      - Graph doc
      - Editor doc
  */

  const isMethod = !!methodId;
  const isSpace = !!spaceId;
  const spaceModel = parent?.type === BackendEntityType.SPACE ? parent.data : undefined;

  const nodeId = pageId ?? spaceModel?.default_node ?? "";

  const space = useConnectedDocument();
  const editor = useConnectedDocument();
  const canvas = useConnectedDocument();
  const method = useConnectedDocument();

  const loadRun = async (runId: string) => {
    const newDoc = new Y.Doc({ guid: `method-${methodId}-${runId}` });
    try {
      if (runId === "new") {
        await loadDisconnectedDoc(`method-${methodId}`, token, newDoc);
      } else {
        await addMethodRunToYdoc(runId, newDoc);
      }
      method.setYDoc(newDoc);
      method.setSynced(true);
      method.setConnected(true);
    } catch (error) {
      method.setError(error as Error);
    }
  };

  // This is required to track whether a method run has been loaded before, it causes errors in
  // development due to StrictMode but is fine in production
  const lastRunId = useRef<string | null>(null);

  useEffect(() => {
    if (!methodId) return;
    console.log("Setting method doc");
    if (!runId) {
      lastRunId.current = null;
      method.create(`method-${methodId}`);
    } else {
      if (lastRunId.current === runId) return;
      lastRunId.current = runId;
      loadRun(runId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId, isMethod, runId]);

  useEffect(() => {
    if (!spaceId) return;
    space.create(`space-${spaceId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => {
    if (!(isSpace && nodeId)) return;
    canvas.create(`node-graph-${nodeId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpace, nodeId]);

  useEffect(() => {
    if (!(isSpace && nodePage)) return;
    editor.create(`node-editor-${nodePage}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpace, nodePage]);

  const value = {
    parent,
    space: isMethod ? method : space,
    canvas: isMethod ? method : canvas,
    editor: isMethod ? method : editor,
  };

  return <YDocContext.Provider value={value}>{children}</YDocContext.Provider>;
}
