import { DirectConnection } from "@hocuspocus/server";
import { getSchema } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Node as ReactFlowNode } from "reactflow";
import showdown from "showdown";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

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
