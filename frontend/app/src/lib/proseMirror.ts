import { JSONContent } from "@tiptap/core";

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

export const isEmptyDocument = (json: JSONContent): boolean => {
  return JSON.stringify(json) === JSON.stringify({ type: "doc", content: [] });
};

export const mergeJSONContent = (
  existingContent: JSONContent,
  newContent: JSONContent,
): JSONContent => {
  // Ensure both contents have a 'content' array
  if (!existingContent.content) {
    existingContent.content = [];
  }

  if (newContent.content) {
    existingContent.content.push(...newContent.content);
  }

  return existingContent;
};
