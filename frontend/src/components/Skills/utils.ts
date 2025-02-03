import { HocuspocusProvider } from "@hocuspocus/provider";
import { prosemirrorJSONToYXmlFragment, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { getSkillRun, getSkillVersion } from "@/api";
import { crdtUrl } from "@/constants";
import { readOnlyEditor } from "@/lib/readOnlyEditor";
import { CustomError } from "@/lib/utils";
import { CanvasEdge, CanvasNode, SkillJson, SkillRun, SkillVersion } from "@/types";

export const formatSkillRunId = (id: string): string => {
  return id.split("-")[0];
};

export const loadDisconnectedDoc = async (
  name: string,
  token: string,
  document: Y.Doc
): Promise<Y.Doc> => {
  return new Promise((resolve, reject) => {
    const tmpDoc = new Y.Doc();
    new HocuspocusProvider({
      url: crdtUrl,
      name,
      document: tmpDoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        reject(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Space Websocket Authentication Failed",
            message: data.reason,
          })
        );
      },
      onSynced() {
        const json = skillYdocToJson(tmpDoc);
        skillJsonToYdoc(json, document);
        return resolve(document);
      },
    });
  });
};

export const addSkillRunToYdoc = async (runId: string, document: Y.Doc): Promise<Y.Doc> => {
  const run = (await getSkillRun(runId)) as SkillRun;
  await skillJsonToYdoc(run.method_data, document);
  return document;
};

export const addVersionToYdoc = async (versionId: string, document: Y.Doc): Promise<Y.Doc> => {
  const version = (await getSkillVersion(versionId)) as SkillVersion;
  await skillJsonToYdoc(version.method_data, document);
  return document;
};

export const skillJsonToYdoc = async (json: { [k: string]: unknown }, document: Y.Doc) => {
  Object.entries(json).map(([key, value]) => {
    if (key.endsWith("-document")) {
      const xml = document.getXmlFragment(key);
      prosemirrorJSONToYXmlFragment(readOnlyEditor.schema, value, xml);
    } else {
      const nodes = document.getMap(key);
      Object.entries(value as SkillRun["method_data"]).map(([key, value]) => {
        nodes.set(key, value);
      });
    }
  });
  return document;
};

export const skillYdocToJson = (document: Y.Doc) => {
  const json: SkillJson = {};
  for (const key of document.share.keys()) {
    if (key.endsWith("-document")) {
      json[key] = yDocToProsemirrorJSON(document, key);
    } else {
      json[key] = document.getMap(key).toJSON();
    }
  }
  return json;
};

/**
 * Removes any node that feeds an "input" node, along with its edge.
 *
 * @param data The entire JSON object containing nodes & edges.
 * @returns A new object with the specified nodes/edges removed.
 */
export const removeInputNodesAndEdges = (data: SkillJson) => {
  // It’s often best to clone so you don’t mutate the original data:
  const newData = structuredClone ? structuredClone(data) : JSON.parse(JSON.stringify(data));

  // Iterate over each key in `newData`
  for (const [key, value] of Object.entries(newData)) {
    // We only care about objects whose key ends with "-canvas-nodes"
    if (!key.endsWith("-canvas-nodes")) {
      continue;
    }

    // The matching edges object should have the same prefix, but with "-canvas-edges" at the end
    const canvasPrefix = key.replace("-canvas-nodes", "");
    const edgesKey = `${canvasPrefix}-canvas-edges`;

    // Ensure we actually have a corresponding edges object
    const nodesMap = value as Record<string, CanvasNode>;
    const edgesMap = newData[edgesKey] as Record<string, CanvasEdge>;
    if (!edgesMap) continue;

    // 1) Find all node-IDs that are "input" nodes
    const inputNodeIds = Object.values(nodesMap)
      .filter((node) => node?.data?.type === "input")
      .map((node) => node.id);

    // 2) Go through each edge; if it targets an input node, remove the source node + edge
    for (const [edgeId, edge] of Object.entries(edgesMap)) {
      if (inputNodeIds.includes(edge.target)) {
        // Remove the source node
        if (edge.source in nodesMap) {
          delete nodesMap[edge.source];
        }
        // Remove this edge from the edges map
        delete edgesMap[edgeId];
      }
    }
  }

  return newData;
};
