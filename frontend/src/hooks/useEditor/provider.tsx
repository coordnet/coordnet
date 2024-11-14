import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

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
  const parent = useBackendParent(methodId, spaceId);

  const [synced, setSynced] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>();
  const [provider, setProvider] = useState<HocuspocusProvider | undefined>();

  const name = nodeId ? `node-editor-${nodeId}` : `method-${methodId}`;
  const document = useMemo(() => (!name ? undefined : new Y.Doc({ guid: name })), [name]);

  useEffect(() => {
    setConnected(false);
    setSynced(false);
    if ((!nodeId && !methodId) || !document) return;
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
          }),
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
