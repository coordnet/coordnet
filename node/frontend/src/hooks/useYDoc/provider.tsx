import { HocuspocusProvider } from "@hocuspocus/provider";
import React, { useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";
import * as Y from "yjs";

import { getSkillRun } from "@/api";
import { addVersionToYdoc } from "@/components/Skills/utils";
import { BackendEntityType, YDocScope } from "@/types";

import useBackendParent from "../useBackendParent";
import useConnectedDocument from "../useConnectedDocument";
import useUser from "../useUser";
import { YDocContext } from "./context";

export type YDocProviderReturn = {
  YDoc: Y.Doc;
  synced: boolean;
  connected: boolean;
  error: Error | undefined;
  provider: HocuspocusProvider | undefined;
  create: (name: string) => () => void;
  reset: () => void;
  setYDoc: React.Dispatch<React.SetStateAction<Y.Doc>>;
  setSynced: React.Dispatch<React.SetStateAction<boolean>>;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>;
};

/**
 * Provider for sharing Y.Docs between components
 */
export function YDocProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, skillId, runId, pageId, versionId } = useParams();
  const [nodePage] = useQueryParam<string>("nodePage");
  const parent = useBackendParent();
  const { isGuest } = useUser();

  const isSkill = !!skillId;
  const isSpace = !!spaceId;
  const spaceModel = parent?.type === BackendEntityType.SPACE ? parent.data : undefined;
  const nodeId = pageId ?? spaceModel?.default_node ?? "";
  const isSkillWriter = parent.data?.allowed_actions.includes("write");
  const scope: YDocScope =
    isSkill && !isSkillWriter && !isGuest && !runId
      ? YDocScope.READ_ONLY_WITH_INPUT
      : runId
        ? YDocScope.READ_ONLY
        : isSkillWriter
          ? YDocScope.READ_WRITE
          : YDocScope.READ_ONLY;

  const space = useConnectedDocument();
  const editor = useConnectedDocument();
  const canvas = useConnectedDocument();
  const skill = useConnectedDocument();

  const loadRun = useCallback(
    async (runId: string) => {
      try {
        await getSkillRun(runId);
        skill.create(`method-run-${runId}`);
      } catch (error) {
        skill.setError(error as Error);
      }
    },
    [skill]
  );

  const loadVersion = useCallback(
    async (versionId: string) => {
      // If there is already a ydoc of the version then use that
      if (skill.YDoc.guid === `method-${skillId}-${versionId}-new`) {
        skill.YDoc.guid = `method-${skillId}-${versionId}`;
        return;
      }
      const newDoc = new Y.Doc({ guid: `method-${skillId}-${versionId}` });
      try {
        await addVersionToYdoc(versionId, newDoc);
        skill.setYDoc(newDoc);
        skill.setSynced(true);
        skill.setConnected(true);
      } catch (error) {
        skill.setError(error as Error);
      }
    },
    [skill, skillId]
  );

  // This is required to track whether a skill run has been loaded before, it causes errors in
  // development due to StrictMode but is fine in production
  const lastRunId = useRef<string | null>(null);

  useEffect(() => {
    if (!skillId || !scope) return;
    if (!runId) {
      lastRunId.current = null;
      if (versionId) {
        loadVersion(versionId);
      } else if (scope == YDocScope.READ_WRITE) {
        skill.create(`method-${skillId}`);
      }
    } else {
      if (lastRunId.current === `${runId}-${versionId}`) return;
      lastRunId.current = `${runId}-${versionId}`;
      loadRun(runId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, isSkill, runId, versionId, scope]);

  useEffect(() => {
    if (!spaceId) return;
    space.create(`space-${spaceId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => {
    if (!(isSpace && nodeId)) return;
    canvas.create(`node-graph-${nodeId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpace, nodeId]);

  useEffect(() => {
    if (!(isSpace && nodePage)) return;
    editor.create(`node-editor-${nodePage}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpace, nodePage]);

  const value = {
    parent,
    scope,
    space: isSkill ? skill : space,
    canvas: isSkill ? skill : canvas,
    editor: isSkill ? skill : editor,
  };

  return <YDocContext.Provider value={value}>{children}</YDocContext.Provider>;
}
