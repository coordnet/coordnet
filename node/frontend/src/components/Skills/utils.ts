import { CanvasEdge, CanvasNode, SkillJson, skillJsonToYdoc, SkillRun } from "@coordnet/core";
import { toast } from "sonner";
import * as Y from "yjs";

import { getSkill, getSkillRun, getSkillVersion } from "@/api";
import { SkillVersion } from "@/types";

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

export const copySkillRunnerUrl = async (skillId?: string) => {
  const toastId = toast.loading("Copying skill runner URL...");
  let errored = false;

  const getUrl = async () => {
    const skill = await getSkill(undefined, skillId);
    const version = skill?.latest_version;
    if (!version?.id) {
      toast.error("Can't share as no version has been published yet", { id: toastId });
      errored = true;
      return "";
    }
    return `${window.location.origin}/skills-runner/${skillId}/${version.id}`;
  };

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      // Use ClipboardItem approach for Safari compatibility
      const clipboardItem = new ClipboardItem({
        "text/plain": getUrl().then((url) => new Blob([url], { type: "text/plain" })),
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      // Fallback for Firefox and other browsers
      await navigator.clipboard.writeText(await getUrl());
    }

    if (!errored) toast.success("Skill runner URL copied to clipboard!", { id: toastId });
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    toast.error("Error copying to clipboard", { id: toastId });
  }
};
