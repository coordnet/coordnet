import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Y from "yjs";

import { getToken } from "@/api/jwt";
import { crdtUrl } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/*
 * Get a string representation of an error, whether it is a string, an Error instance, or an object
 * @param error - The error to get a string representation of
 * @returns A string representation of the error
 */
export const getErrorMessage = (error: unknown): string => {
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle error-like objects
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;

    // Check for common error properties
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }

    // Handle API error responses
    if (typeof errorObj.data === "object" && errorObj.data) {
      const data = errorObj.data as Record<string, unknown>;
      if (typeof data.message === "string") {
        return data.message;
      }
    }

    // Handle response.data.error patterns
    if (typeof errorObj.response === "object" && errorObj.response) {
      const response = errorObj.response as Record<string, unknown>;
      if (typeof response.data === "object" && response.data) {
        const data = response.data as Record<string, unknown>;
        if (typeof data.error === "string") {
          return data.error;
        }
        if (typeof data.message === "string") {
          return data.message;
        }
      }
    }

    // Try to stringify object errors
    try {
      return JSON.stringify(error);
    } catch {
      return "[Complex Error Object]";
    }
  }

  // Handle primitive values
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "number") {
    return `Error code: ${error}`;
  }

  // Last resort
  return String(error);
};

export const title = (title: string = "") => {
  document.title = `${title} - coordination.network`;
};

export class CustomError extends Error {
  code: string;
  name: string;

  constructor({ code, name, message }: { code: string; name: string; message: string }) {
    super(message);
    this.code = code;
    this.name = name;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const metaKey = (shortcut: string | number) => {
  const platform = navigator.userAgent.toLowerCase();
  if (platform.includes("mac")) {
    return "⌘" + shortcut;
  } else {
    return "Ctrl + " + shortcut;
  }
};

export const createConnectedYDoc = async (name: string): Promise<[Y.Doc, HocuspocusProvider]> => {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const websocketProvider = new HocuspocusProviderWebsocket({
      url: crdtUrl,
      messageReconnectTimeout: 300000,
    });
    const provider = new HocuspocusProvider({
      name,
      websocketProvider,
      document: doc,
      token: getToken,
    });
    provider.attach();

    let isConnected = false;
    let isSynced = false;

    const checkReady = () => {
      if (isConnected && isSynced) {
        resolve([doc, provider]);
      }
    };

    const onConnect = () => {
      isConnected = true;
      checkReady();
    };

    const onSynced = () => {
      if (provider.isSynced) {
        isSynced = true;
        checkReady();
      }
    };

    provider.on("connect", onConnect);
    provider.on("synced", onSynced);
    provider.on("authenticationFailed", (error: unknown) => {
      provider.off("connect", onConnect);
      provider.off("synced", onSynced);
      reject(error);
    });
  });
};

/**
 * Converts a data URI to a Blob object.
 *
 * @param dataURI - The data URI to convert.
 * @returns A Blob object representing the data URI.
 */
export const dataURItoBlob = (dataURI: string): Blob => {
  // Convert base64 to raw binary data held in a string
  const byteString = atob(dataURI.split(",")[1]);

  // Separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // Write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // Write the ArrayBuffer to a Blob and return it
  return new Blob([ab], { type: mimeString });
};
