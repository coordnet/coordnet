import { JSONContent } from "@tiptap/core";
import { yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { CanvasNode } from "./types";

export const findExtremePositions = (nodes: CanvasNode[]) => {
  let minX = 0;
  let maxX = -0;
  let minY = 0;
  let maxY = -0;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return { minX, maxX, minY, maxY };
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

export type FormatReturnType<T extends "plain" | "json"> = T extends "json" ? JSONContent : string;

/**
 * Retrieves the content of a given XML fragment in the specified format.
 *
 * @param xmlFragment - The XML fragment to retrieve content from.
 * @param format - The format in which to retrieve the content ("plain" or "json").
 * @returns The content of the XML fragment in the specified format, or undefined if an error occurs.
 */
export const getNodeContent = <T extends "plain" | "json">(
  xmlFragment: Y.XmlFragment,
  format: T,
): FormatReturnType<T> | undefined => {
  try {
    const json = yXmlFragmentToProsemirrorJSON(xmlFragment);
    if (format == "plain") {
      const text = proseMirrorJSONToText(json);
      return text as FormatReturnType<T>;
    }
    if (format == "json") {
      return json as FormatReturnType<T>;
    }
  } catch (e) {
    // toast.error("Failed to get node content");
    console.error("Failed to get node content", e);
  }
  return;
};

export const getSkillNodePageContent = <T extends "plain" | "json" = "plain">(
  id: string,
  document: Y.Doc,
  format: T = "plain" as T,
): FormatReturnType<T> | undefined => {
  const xml = document.getXmlFragment(`${id}-document`);
  return getNodeContent(xml, format);
};
