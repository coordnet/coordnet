import {
  CanvasEdge,
  CanvasNode,
  SkillJson,
  skillJsonToYdoc,
  SkillRun,
  SkillVersion,
} from "@coordnet/core";
import * as Y from "yjs";

import { getSkillRun, getSkillVersion } from "@/api";

export const formatSkillRunId = (id: string): string => {
  return id.split("-")[0];
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

// Function to recursively replace method ID references in the method_data
export const forkMethodData = (
  obj: unknown,
  originalMethodId: string,
  newMethodId: string
): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Replace any occurrence of the original method ID with the new one
    return obj.includes(originalMethodId)
      ? obj.replace(new RegExp(originalMethodId, "g"), newMethodId)
      : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => forkMethodData(item, originalMethodId, newMethodId));
  }

  if (typeof obj === "object") {
    const result: { [key: string]: unknown } = {};
    for (const [key, value] of Object.entries(obj)) {
      // Replace method ID in both keys and values
      const newKey = key.includes(originalMethodId)
        ? key.replace(new RegExp(originalMethodId, "g"), newMethodId)
        : key;
      result[newKey] = forkMethodData(value, originalMethodId, newMethodId);
    }
    return result;
  }

  return obj;
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
