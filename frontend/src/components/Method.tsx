import "./Editor/styles.css";

import * as blockies from "blockies-ts";
import clsx from "clsx";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";

import { CanvasProvider, useCanvas, useNodesContext } from "@/hooks";
import useUser from "@/hooks/useUser";
import { BackendEntityType } from "@/types";

import { Graph, Loader } from "./";
import ErrorPage from "./ErrorPage";

type MethodProps = { id?: string; isMethodRun?: boolean; className?: string };

const Method = ({ className }: MethodProps) => {
  const { runId } = useParams();
  const { parent } = useNodesContext();
  const { isGuest } = useUser();
  const { error, connected, synced, parent: canvasParent } = useCanvas();

  if (error) return <ErrorPage error={error} />;
  if (!runId && (!synced || canvasParent.isLoading)) return <Loader message="Loading canvas..." />;
  if (!runId && !connected) return <Loader message="Obtaining connection to canvas..." />;

  const method = parent.type === BackendEntityType.METHOD ? parent.data : undefined;
  const methodIcon = blockies.create({ seed: method?.id }).toDataURL();
  const methodTitle = method?.title ?? "Untitled";

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "absolute top-0 z-20 flex h-9 gap-2 leading-9",
          isGuest ? "left-2" : "left-24"
        )}
      >
        <div
          className="flex items-center rounded border border-neutral-200 bg-white px-3 text-sm
            font-medium text-neutral-900"
        >
          {method && (
            <>
              <img src={methodIcon} className="mr-2 size-4 rounded-full" />
              {methodTitle}
            </>
          )}
        </div>
      </div>
      <Graph />
    </div>
  );
};

const MethodOuter = ({ id, ...props }: MethodProps) => {
  const { pageId } = useParams();

  return (
    <CanvasProvider methodId={id} methodNodeId={pageId}>
      <ReactFlowProvider>
        <Method {...props} />
      </ReactFlowProvider>
    </CanvasProvider>
  );
};

export default MethodOuter;
