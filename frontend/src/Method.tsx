import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, Loader, Method as MethodCanvas, QuickView } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import { EditorProvider, NodesContextProvider, useNodesContext } from "@/hooks";

import { title } from "./lib/utils";
import { BackendEntityType } from "./types";

const Method = () => {
  const { pageId, methodId } = useParams();
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

    // If at the default node, reset the breadcrumbs
    if (nodeId == method.id) {
      setBreadcrumbs([]);
      return;
    }

    // Otherwise add the node to the breadcrumbs
    setBreadcrumbs((prev) => {
      if (prev[prev.length - 1] === nodeId) return prev;
      // If the ID is lower down the chain then go back to it
      const index = prev.indexOf(nodeId);
      if (index !== -1) return prev.slice(0, index + 1);
      return [...prev.filter((id) => id !== method.id), nodeId];
    });
  }, [breadcrumbs, setBreadcrumbs, nodeId, method]);

  return (
    <>
      {(!synced || parent.isLoading) && !error ? (
        <Loader message="Loading method..." className="z-60" />
      ) : !connected && !error ? (
        <Loader message="Obtaining connection for method..." className="z-60" />
      ) : (
        <></>
      )}
      <div className="relative flex h-full flex-col">
        <Header id={nodeId} />
        {!method && error ? (
          <ErrorPage error={error} />
        ) : (
          <>
            <MethodCanvas key={methodId} id={methodId} className="w-full flex-grow" />
            <EditorProvider methodId={methodId}>
              <Editor
                id={nodePage}
                key={nodePage}
                className="absolute bottom-0 right-0 top-6 z-20 w-1/2 bg-white shadow-md"
              />
            </EditorProvider>
            <QuickView />
          </>
        )}
      </div>
    </>
  );
};

const MethodOuter = () => {
  const { methodId, runId } = useParams();
  return (
    <NodesContextProvider key={`${methodId}-${runId}`}>
      <Method />
    </NodesContextProvider>
  );
};

export default MethodOuter;
