import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, Loader, Method as MethodCanvas, QuickView } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import { NodesContextProvider, useNodesContext } from "@/hooks";

import { title } from "./lib/utils";
import { BackendEntityType } from "./types";

const Method = () => {
  const { pageId, methodId, runId } = useParams();
  const { parent, synced, connected, error, breadcrumbs, setBreadcrumbs } = useNodesContext();
  const [nodePage] = useQueryParam<string>("nodePage");

  const method = parent.type === BackendEntityType.METHOD ? parent?.data : undefined;
  const nodeId = pageId ?? method?.id ?? "";

  // TODO: If the user can't edit then redirect them to the latest version
  // const canEdit = Boolean(method?.allowed_actions.includes("write"));
  // console.log("yo the user", canEdit, "can edit");

  useEffect(() => {
    if (method) title(method.title ?? "Untitled");
  }, [method]);

  useEffect(() => {
    if (!method) return;
    // If in an iframe (QuickView) don't add
    if (window.self !== window.top) return;

    let updatedBreadcrumbs: string[] = [];

    // If at the default node, reset the breadcrumbs
    if (nodeId === method.id) {
      updatedBreadcrumbs = [];
    } else {
      // Handle primary breadcrumbs based on nodeId
      const index = breadcrumbs.indexOf(nodeId);
      if (index !== -1) {
        updatedBreadcrumbs = breadcrumbs.slice(0, index + 1);
      } else {
        updatedBreadcrumbs = [...breadcrumbs.filter((id) => id !== method.id), nodeId];
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
  }, [breadcrumbs, setBreadcrumbs, nodeId, method, runId]);

  return (
    <>
      {parent.isLoading && !error ? (
        <Loader message="Loading method..." className="z-60" />
      ) : !connected && !runId && !error ? (
        <Loader message="Obtaining connection for method..." className="z-60" />
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
        {!method && error ? (
          <ErrorPage error={error} />
        ) : (
          <>
            <MethodCanvas key={methodId} id={methodId} className="w-full flex-grow" />
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

const MethodOuter = () => {
  return (
    <NodesContextProvider>
      <Method />
    </NodesContextProvider>
  );
};

export default MethodOuter;
