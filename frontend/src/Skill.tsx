import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, Loader, QuickView, Skill as SkillCanvas } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import { CanvasProvider, NodesContextProvider, useNodesContext, useYDoc } from "@/hooks";

import { getSkillVersions } from "./api";
import { title } from "./lib/utils";
import { BackendEntityType, YDocScope } from "./types";

const Skill = () => {
  const navigate = useNavigate();
  const { pageId, skillId, runId, versionId } = useParams();
  const {
    parent,
    scope,
    space: { connected, synced, error },
  } = useYDoc();
  const { breadcrumbs, setBreadcrumbs } = useNodesContext();
  const [nodePage] = useQueryParam<string>("nodePage");

  const skill = parent.type === BackendEntityType.SKILL ? parent?.data : undefined;
  const nodeId = pageId ?? skill?.id ?? "";

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["skills", parent.id, "versions"],
    queryFn: ({ signal }) => getSkillVersions(signal, parent?.id ?? ""),
    enabled: Boolean(skill && scope == YDocScope.READ_ONLY),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  useEffect(() => {
    if (skill) title(skill.title ?? "Untitled");
  }, [skill]);

  // Redirect to the latest version if no versionId is provided and the skill is read-only
  useEffect(() => {
    if (scope == YDocScope.READ_ONLY && versions.count > 0 && !versionId && !runId) {
      const latestVersion = versions.results.reduce((latest, current) =>
        new Date(latest.updated_at) >= new Date(current.updated_at) ? latest : current
      );
      navigate(`/skills/${skillId}/versions/${latestVersion.id}`, { replace: true });
    }
  }, [scope, versions, versionId, navigate, skillId, runId]);

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
      {(parent.isLoading || versionsLoading) && !error ? (
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
            <CanvasProvider skillId={skillId} skillNodeId={pageId}>
              <SkillCanvas key={skillId} className="w-full flex-grow" />
              <Editor
                id={nodePage}
                key={nodePage}
                className="absolute bottom-0 right-0 top-6 z-20 w-1/2 bg-white shadow-md"
              />
              <QuickView />
            </CanvasProvider>
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
