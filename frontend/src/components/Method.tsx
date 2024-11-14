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

type MethodProps = { id?: string; className?: string };

const Method = ({ className }: MethodProps) => {
  const { parent } = useNodesContext();
  const { isGuest } = useUser();
  const { error, connected, synced, parent: canvasParent } = useCanvas();

  if (error) return <ErrorPage error={error} />;
  if (!synced || canvasParent.isLoading) return <Loader message="Loading canvas..." />;
  if (!connected) return <Loader message="Obtaining connection to canvas..." />;

  const method = parent.type === BackendEntityType.METHOD ? parent.data : undefined;
  const methodIcon = blockies.create({ seed: method?.id }).toDataURL();

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "absolute top-0 z-20 flex h-9 leading-9 gap-2",
          isGuest ? "left-2" : "left-24",
        )}
      >
        <div className="border border-neutral-200 bg-white text-neutral-900 font-medium text-sm px-3 rounded flex items-center">
          {method && (
            <>
              <img src={methodIcon} className="size-4 rounded-full mr-2" />
              {method?.title}
            </>
          )}
        </div>
        {/* <Button
          variant="outline"
          className="size-9 p-0"
          onClick={() => setNodePage(nodePage == id ? "" : id)}
          data-tooltip-id="show-editor"
          data-tooltip-place="bottom"
        >
          <FileText strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="show-editor">Node Page</Tooltip> */}
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
