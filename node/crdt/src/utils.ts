import { settings } from "./settings";

export const getDocumentType = (name: string) => {
  if (name.startsWith("space-")) {
    return "SPACE";
  } else if (name.startsWith("method-run-")) {
    return "SKILL_RUN";
  } else if (name.startsWith("method-")) {
    return "SKILL";
  } else if (name.startsWith("node-graph-")) {
    return "CANVAS";
  } else if (name.startsWith("node-editor-")) {
    return "EDITOR";
  }
};

export const cleanDocumentName = (name: string) => {
  return name.replace(/^(node-graph-|space-|node-editor-|method-run-|method-)/, "");
};

export const backendRequest = (path: string, token?: string) => {
  const headers: { [key: string]: string } = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${settings.BACKEND_URL}/${path}`, { headers });
};
