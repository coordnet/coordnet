import { DirectConnection } from "@hocuspocus/server";
import { getSchema } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Node as ReactFlowNode } from "@xyflow/react";
import { Request } from "express";
import showdown from "showdown";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

import { settings } from "./settings";

export const getDocumentType = (name: string) => {
  if (name.startsWith("space-")) {
    return "SPACE";
  } else if (name.startsWith("method-")) {
    return "SKILL";
  } else if (name.startsWith("node-graph-")) {
    return "CANVAS";
  } else if (name.startsWith("node-editor-")) {
    return "EDITOR";
  }
};

export const cleanDocumentName = (name: string) => {
  return name.replace(/^(node-graph-|space-|node-editor-|method-)/, "");
};

export const backendRequest = (path: string, token?: string) => {
  const headers: { [key: string]: string } = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }
  return fetch(`${settings.BACKEND_URL}/${path}`, { headers });
};

export const authRequest = (request: Request) => {
  return (
    settings.WEBSOCKET_API_KEY &&
    settings.WEBSOCKET_API_KEY !== "" &&
    request.header("Authorization") === `Token ${settings.WEBSOCKET_API_KEY}`
  );
};

const converter = new showdown.Converter();
const extensions = [StarterKit];
const schema = getSchema(extensions);

export const appendTextToNodePage = async (connection: DirectConnection, text: string) => {
  return await connection.transact(async (editorDoc) => {
    const xml = editorDoc.getXmlFragment("default");
    const html = converter.makeHtml(text);
    const json = generateJSON(html, extensions);
    prosemirrorJSONToYXmlFragment(schema, json, xml);
    // newXml.forEach((child) => { xml.insert(xml.length, [child.clone()]); });
  });
};

export const findCentralNode = (ids: string[], nodesMap: Y.Map<ReactFlowNode>) => {
  const sourceNodes = ids.map((id) => nodesMap.get(id) as ReactFlowNode);
  const averageX = sourceNodes.reduce((acc, node) => acc + node.position.x, 0) / sourceNodes.length;
  const averageY = sourceNodes.reduce((acc, node) => acc + node.position.y, 0) / sourceNodes.length;
  const centralTargetNode = sourceNodes.reduce(
    (nearest, node) => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - averageX, 2) + Math.pow(node.position.y - averageY, 2),
      );
      return nearest.distance < distance ? nearest : { node, distance };
    },
    { node: sourceNodes[0], distance: Infinity },
  );
  return centralTargetNode.node;
};
