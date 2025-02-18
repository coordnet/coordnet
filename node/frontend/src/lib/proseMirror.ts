import { JSONContent } from "@tiptap/core";

export const isEmptyDocument = (json: JSONContent): boolean => {
  return JSON.stringify(json) === JSON.stringify({ type: "doc", content: [] });
};
