import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParam } from "use-query-params";

import { Editor, Header, LLM, Loader, Node, NodeRepository, QuickView } from "@/components";
import ErrorPage from "@/components/ErrorPage";
import {
  CanvasProvider,
  NodeProvider,
  NodesContextProvider,
  useNodesContext,
  useYDoc,
} from "@/hooks";
import { title } from "@/lib/utils";

import { BackendEntityType } from "./types";

const Space = () => {
  const { pageId, spaceId } = useParams();
  const {
    parent,
    space: { connected, synced, error },
  } = useYDoc();
  const { breadcrumbs, setBreadcrumbs } = useNodesContext();
  const [nodePage] = useQueryParam<string>("nodePage");

  const space = parent.type === BackendEntityType.SPACE ? parent?.data : undefined;
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
      {(!synced || parent.isLoading) && !error ? (
        <Loader message="Loading space..." className="z-60" />
      ) : !connected && !error ? (
        <Loader message="Obtaining connection for space..." className="z-60" />
      ) : (
        <></>
      )}
      <div className="relative flex h-full flex-col">
        <Header id={nodeId} />
        {!space && error ? (
          <ErrorPage error={error} />
        ) : (
          <>
            <NodeProvider id={nodeId}>
              <NodeRepository />
              <LLM id={nodeId} />
              <CanvasProvider nodeId={nodeId} spaceId={spaceId}>
                <Node key={nodeId} id={nodeId} className="w-full flex-grow" />
                <Editor
                  id={nodePage}
                  key={nodePage}
                  className="absolute md:top-6 top-4 right-0 bottom-0 md:w-1/2 w-full z-20 bg-white shadow-md"
                />
              </CanvasProvider>
              <QuickView />
            </NodeProvider>
          </>
        )}
      </div>
    </>
  );
};

const SpaceOuter = () => {
  return (
    <NodesContextProvider>
      <Space />
    </NodesContextProvider>
  );
};

export default SpaceOuter;
