import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, LLM, Loader, Node, NodeRepository, QuickView } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import { NodeProvider, useSpace } from "@/hooks";
import { title } from "@/lib/utils";

function App() {
  const { pageId } = useParams();
  const { space, spaceError, synced, connected, breadcrumbs, setBreadcrumbs, spaceLoading } =
    useSpace();
  const [nodePage] = useQueryParam<string>("nodePage");

  const nodeId = pageId ?? space?.default_node ?? "";

  useEffect(() => {
    if (space) title(space.title);
  }, [space]);

  useEffect(() => {
    if (!nodeId) return;
    // If in an iframe (QuickView) don't add
    if (window.self !== window.top) return;

    // If at the default node, reset the breadcrumbs
    if (nodeId == space?.default_node) {
      setBreadcrumbs([]);
      return;
    }

    // Otherwise add the node to the breadcrumbs
    setBreadcrumbs((prev) => {
      if (prev[prev.length - 1] === nodeId) return prev;
      // If the ID is lower down the chain then go back to it
      const index = prev.indexOf(nodeId);
      if (index !== -1) return prev.slice(0, index + 1);
      return [...prev.filter((id) => id !== space?.default_node), nodeId];
    });
  }, [breadcrumbs, setBreadcrumbs, nodeId, space?.default_node]);

  return (
    <>
      {(!synced || spaceLoading) && !spaceError ? (
        <Loader message="Loading space..." className="z-60" />
      ) : !connected && !spaceError ? (
        <Loader message="Obtaining connection for space..." className="z-60" />
      ) : (
        <></>
      )}
      <div className="h-full relative flex flex-col">
        <Header id={nodeId} />
        {!space && spaceError ? (
          <ErrorPage error={spaceError} />
        ) : (
          <>
            <NodeRepository />
            <LLM id={nodeId} />
            <Node key={nodeId} id={nodeId} className="flex-grow w-full" />
            <NodeProvider id={nodePage}>
              <Editor
                id={nodePage}
                key={nodePage}
                className="absolute top-6 right-0 bottom-0 w-1/2 z-20 bg-white shadow-md"
              />
            </NodeProvider>
            <QuickView />
          </>
        )}
      </div>
    </>
  );
}

export default App;
