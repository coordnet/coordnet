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

  useEffect(() => {
    if (method) title(method.title);
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
      <div className="h-full relative flex flex-col">
        <Header id={nodeId} />
        {!method && error ? (
          <ErrorPage error={error} />
        ) : (
          <>
            <MethodCanvas key={methodId} id={methodId} className="flex-grow w-full" />
            <EditorProvider methodId={methodId}>
              <Editor
                id={nodePage}
                key={nodePage}
                className="absolute top-6 right-0 bottom-0 w-1/2 z-20 bg-white shadow-md"
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
  const { methodId } = useParams();
  return (
    <NodesContextProvider methodId={methodId}>
      <Method />
    </NodesContextProvider>
  );
};

export default MethodOuter;
