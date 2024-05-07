import { HocuspocusProvider } from "@hocuspocus/provider";
import { JSONContent } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";
import DOMPurify from "dompurify";
import store from "store2";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

import { getNode } from "./api";

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

export const waitForNode = async (id: string, maxRetries = 20, retryDelay = 500) => {
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
