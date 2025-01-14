import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import * as Y from "yjs";

import { addMethodRunToYdoc, loadDisconnectedDoc } from "@/components/Methods/utils";
import { crdtUrl } from "@/constants";
import { CustomError } from "@/lib/utils";

import useBackendParent from "../useBackendParent";
import useUser from "../useUser";
import { EditorContext } from "./context";

/**
 * Provider for sharing an editor between components
 */
export function EditorProvider({
  nodeId,
  spaceId,
  methodId,
  children,
}: {
  nodeId?: string;
  spaceId?: string;
  methodId?: string;
  children: React.ReactNode;
}) {
  const { token } = useUser();
  const { runId } = useParams();
  const parent = useBackendParent(methodId, spaceId);

  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>();
  const [provider, setProvider] = useState<HocuspocusProvider | undefined>();

  const name = nodeId ? `node-editor-${nodeId}` : `method-${methodId}`;
  const document = useMemo(() => new Y.Doc({ guid: name }), [name]);

  // const [document, setDocument] = useState<Y.Doc | undefined>(undefined);
  // const document = useMemo(() => (!name ? undefined : new Y.Doc({ guid: name })), [name]);

  const loadMethod = useCallback(
    async (runId: string) => {
      try {
        if (runId === "new") {
          await loadDisconnectedDoc(name, token, document);
        } else {
          await addMethodRunToYdoc(runId, document);
        }
        setSynced(true);
        setConnected(true);
      } catch (error) {
        toast.error("Failed to load the document");
        console.error("Failed to load the document:", error);
      }
    },
    [document, name, token]
  );

  useEffect(() => {
    if (!spaceId && !methodId) return;
    if (runId) {
      loadMethod(runId);
      return;
    }
    const newProvider = new HocuspocusProvider({
      url: crdtUrl,
      name,
      document,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        setError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Editor Websocket Authentication Failed",
            message: data.reason,
          })
        );
      },
      onSynced() {
        setSynced(true);
      },
      onStatus(data) {
        setConnected(data.status == "connected");
      },
    });
    setProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
  }, [nodeId, document]);

  const value = {
    parent: parent,
    yDoc: document,
    provider,
    connected,
    synced,
    error,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
