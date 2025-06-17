import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { useState } from "react";
import * as Y from "yjs";

import { getToken } from "@/api/jwt";
import { crdtUrl } from "@/constants";
import { CustomError } from "@/lib/utils"; // or whichever error you need

import { YDocProviderReturn } from "./useYDoc/provider";

/**
 * Custom hook to manage a Yjs document with a Hocuspocus provider.
 *
 * @returns {YDocProviderReturn} An object containing the Yjs document, connection status, sync
 * status, error, provider, and various state setters.
 *
 * @remarks
 * This hook initializes a Yjs document and sets up a Hocuspocus provider for real-time
 * collaboration. It handles authentication, connection status, and synchronization status.
 */
const useConnectedDocument = (): YDocProviderReturn => {
  const [YDoc, setYDoc] = useState<Y.Doc>(() => new Y.Doc());
  const [synced, setSynced] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [provider, setProvider] = useState<HocuspocusProvider>();

  const reset = () => {
    YDoc.destroy();
    setYDoc(new Y.Doc());
    setSynced(false);
    setConnected(false);
    setError(undefined);
    setProvider(undefined);
  };

  const create = (name: string) => {
    if (provider) {
      provider.destroy();
      setProvider(undefined);
    }

    // Reset state immediately
    setSynced(false);
    setConnected(false);
    setError(undefined);

    YDoc.destroy();
    const newSpaceDoc = new Y.Doc({ guid: name });
    setYDoc(newSpaceDoc);

    const websocketProvider = new HocuspocusProviderWebsocket({
      url: crdtUrl,
      messageReconnectTimeout: 300000,
    });
    const newProvider = new HocuspocusProvider({
      name,
      document: newSpaceDoc,
      token: getToken,
      websocketProvider,
      onAuthenticationFailed(data) {
        setError(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Websocket Authentication Failed",
            message: data.reason,
          })
        );
      },
      onSynced() {
        setSynced(true);
      },
      onConnect() {
        setConnected(true);
      },
      onDisconnect() {
        setConnected(false);
      },
    });

    newProvider.attach();
    setProvider(newProvider);

    // Cleanup old provider on unmount or dependency change
    return () => {
      newProvider.destroy();
      websocketProvider.destroy();
    };
  };

  return {
    YDoc,
    synced,
    connected,
    error,
    provider,
    create,
    reset,
    setYDoc,
    setSynced,
    setConnected,
    setError,
  };
};

export default useConnectedDocument;
