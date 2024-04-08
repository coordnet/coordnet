import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, LLM, Loader, Node, NodeRepository, QuickView } from "@/components";
import { NodeProvider, useSpace } from "@/hooks";

import ErrorPage from "./components/ErrorPage";

function App() {
  const { pageId } = useParams();
  const { space, spaceError, synced, connected, breadcrumbs, setBreadcrumbs } = useSpace();
  const [nodePage] = useQueryParam<string>("nodePage");

  const nodeId = pageId ?? space?.default_node ?? "";

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
  }, [breadcrumbs, setBreadcrumbs, nodeId]);

  if (!space && spaceError) return <ErrorPage error={spaceError} />;
  if (!synced) return <Loader message="Loading space..." />;
  if (!connected) return <Loader message="Obtaining connection for space..." />;

  return (
    <div className="h-full relative flex flex-col">
      <NodeRepository />
      <LLM id={nodeId} />
      <Header id={nodeId} />
      <Node key={nodeId} id={nodeId} className="flex-grow w-full" />
      <NodeProvider id={nodePage}>
        <Editor
          id={nodePage}
          key={nodePage}
          className="absolute top-6 right-0 bottom-0 w-1/2 z-20 bg-white shadow-md"
        />
      </NodeProvider>
      <QuickView />
    </div>
  );
}

export default App;
