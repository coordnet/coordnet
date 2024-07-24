import { HocuspocusProvider } from "@hocuspocus/provider";
import { JSONContent } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";
import DOMPurify from "dompurify";
import store from "store2";
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { getNode } from "./api";
import { GraphNode } from "./types";

/*
 * Get a string representation of an error, whether it is a string, an Error instance, or an object
 * @param error - The error to get a string representation of
 * @returns A string representation of the error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getErrorMessage = (error: any): string => {
  if (typeof error === "string") {
    return error;
  }

  // Check if error is an instance of Error
  if (error instanceof Error) {
    return error.message;
  }

  // Handle error objects (like from API responses)
  const errorObj: { statusText?: string; message?: string } = error;
  if (errorObj?.statusText) {
    return errorObj.statusText;
  }
  if (errorObj?.message) {
    return errorObj.message;
  }

  // Attempt to stringify the error if it is an object
  try {
    const errorString = JSON.stringify(error, null, 2);
    // Avoid returning empty or non-informative strings
    if (errorString && errorString !== "{}" && errorString !== '""') {
      return errorString;
    }
  } catch {
    // Fallback in case of JSON.stringify failure
  }

  return `An error occurred: ${String(error)}`;
};

export const proseMirrorJSONToText = (jsonData: JSONContent) => {
  const textValues: string[] = [];

  // Recursive function to traverse the JSON structure
  function extractText(node: JSONContent) {
    if (node.type === "text" && node.text) {
      textValues.push(node.text);
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        extractText(child);
      }
    }
  }

  // Start extraction from the "content" array
  if (jsonData.content && Array.isArray(jsonData.content)) {
    for (const contentItem of jsonData.content) {
      extractText(contentItem);
    }
  }

  // Join the extracted text values with a space
  return textValues.join(" ");
};
export const getNodePageContent = async (id: string): Promise<string> => {
  const token = store("coordnet-auth");
  const roomName = `node-editor-${id}`;
  const ydoc = new Y.Doc({ guid: roomName });

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const provider = new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name: roomName,
      document: ydoc,
      token,
      onOpen() {
        timeout = setTimeout(() => {
          reject(new Error("Timeout: Operation took longer than 15 seconds: " + id));
        }, 15000);
      },
      onSynced() {
        if (timeout) clearTimeout(timeout); // Clear the timeout if operation is successful
        try {
          const fragment = ydoc?.getXmlFragment("default");
          const json = yXmlFragmentToProsemirrorJSON(fragment);
          const text = proseMirrorJSONToText(json);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      },
    });

    // Reject the promise if there's an error with the provider setup
    provider.on("error", (error: unknown) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });
  });
};

export const setNodePageContent = (content: JSONContent, roomName: string, schema: Schema) => {
  const token = store("coordnet-auth");
  const ydoc = new Y.Doc({ guid: roomName });
  new HocuspocusProvider({
    url: import.meta.env.VITE_HOCUSPOCUS_URL,
    name: roomName,
    document: ydoc,
    token,
  });
  const xml = ydoc?.getXmlFragment("default");
  prosemirrorJSONToYXmlFragment(schema, content, xml);
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForNode = async (id: string, maxRetries = 50, retryDelay = 500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getNode(undefined, id);
      return;
    } catch (error) {
      console.error(`Node not found yet (${attempt}/${maxRetries}):`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to retrieve node after ${maxRetries} attempts`);
      }
      await delay(retryDelay);
    }
  }
};

export const cleanNodeTitle = (title: string | undefined) => {
  return DOMPurify.sanitize(title ?? "", {
    ALLOWED_TAGS: [],
  });
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
};

export const createConnectedYDoc = async (
  name: string,
  token: string,
): Promise<[Y.Doc, HocuspocusProvider]> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return new Promise((resolve, _reject) => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: import.meta.env.VITE_HOCUSPOCUS_URL,
      name,
      document: doc,
      token,
      preserveConnection: false,
    });

    let isConnected = false;
    let isSynced = false;

    const checkReady = () => {
      if (isConnected && isSynced) {
        resolve([doc, provider]);
      }
    };

    const onStatus = (event: { status: string }) => {
      if (event.status === "connected") {
        isConnected = true;
        checkReady();
      }
    };

    const onSynced = () => {
      if (provider.isSynced) {
        isSynced = true;
        checkReady();
      }
    };

    provider.on("status", onStatus);
    provider.on("synced", onSynced);
  });
};

export const getCanvasNodes = async (id: string): Promise<GraphNode[]> => {
  const token = store("coordnet-auth");
  const [graphDoc, graphProvider] = await createConnectedYDoc(`node-graph-${id}`, token);
  const nodesMap = graphDoc.getMap<GraphNode>("nodes");
  const nodes = Array.from(nodesMap.values());
  graphProvider.destroy();
  return nodes;
};
