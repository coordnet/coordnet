import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, Loader, QuickView, Skill as SkillCanvas } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import { NodesContextProvider, useNodesContext } from "@/hooks";

import { title } from "./lib/utils";
import { BackendEntityType } from "./types";

const Skill = () => {
  const { pageId, skillId, runId } = useParams();
  const { parent, synced, connected, error, breadcrumbs, setBreadcrumbs } = useNodesContext();
  const [nodePage] = useQueryParam<string>("nodePage");

  const skill = parent.type === BackendEntityType.SKILL ? parent?.data : undefined;
  const nodeId = pageId ?? skill?.id ?? "";

  // TODO: If the user can't edit then redirect them to the latest version
  // const canEdit = scope == YDocScope.READ_WRITE;
  // console.log("yo the user", canEdit, "can edit");

  useEffect(() => {
    if (skill) title(skill.title ?? "Untitled");
  }, [skill]);

  useEffect(() => {
    if (!skill) return;
    // If in an iframe (QuickView) don't add
    if (window.self !== window.top) return;

    let updatedBreadcrumbs: string[] = [];

    // If at the default node, reset the breadcrumbs
    if (nodeId === skill.id) {
      updatedBreadcrumbs = [];
    } else {
      // Handle primary breadcrumbs based on nodeId
      const index = breadcrumbs.indexOf(nodeId);
      if (index !== -1) {
        updatedBreadcrumbs = breadcrumbs.slice(0, index + 1);
      } else {
        updatedBreadcrumbs = [...breadcrumbs.filter((id) => id !== skill.id), nodeId];
      }
    }

    // Handle runId for breadcrumbs
    if (runId) {
      const runLabel = runId === "new" ? "new-run" : `run-${runId}`;
      const lastBreadcrumb = updatedBreadcrumbs[updatedBreadcrumbs.length - 1];

      if (lastBreadcrumb !== runLabel) {
        updatedBreadcrumbs = [...updatedBreadcrumbs, runLabel];
      }
    }

    setBreadcrumbs(updatedBreadcrumbs);
  }, [breadcrumbs, setBreadcrumbs, nodeId, skill, runId]);

  return (
    <>
      {parent.isLoading && !error ? (
        <Loader message="Loading skill..." className="z-60" />
      ) : !connected && !runId && !error ? (
        <Loader message="Obtaining connection for skill..." className="z-60" />
      ) : !connected && runId && runId !== "new" && !error ? (
        <Loader message="Loading run..." className="z-60 bg-white/30" />
      ) : (
        <></>
      )}
      {!parent.isLoading && !error && !synced && runId == "new" && (
        <Loader message="Creating run..." className="z-60 bg-white/30" />
      )}
      <div className="relative flex h-full flex-col">
        <Header id={nodeId} />
        {!skill && error ? (
          <ErrorPage error={error} />
        ) : (
          <>
            <SkillCanvas key={skillId} id={skillId} className="w-full flex-grow" />
            <Editor
              id={nodePage}
              key={nodePage}
              className="absolute bottom-0 right-0 top-6 z-20 w-1/2 bg-white shadow-md"
            />
            <QuickView />
          </>
        )}
      </div>
    </>
  );
};

const SkillOuter = () => {
  return (
    <NodesContextProvider>
      <Skill />
    </NodesContextProvider>
  );
};

export default SkillOuter;
