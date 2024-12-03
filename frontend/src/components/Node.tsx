import "./Editor/styles.css";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { ReactFlowProvider } from "reactflow";
import { StringParam, useQueryParam, withDefault } from "use-query-params";

import { getSpaceProfile } from "@/api";
import { NodeProvider, useNode, useSpace } from "@/hooks";
import useUser from "@/hooks/useUser";

import { Graph, Loader } from "./";
import ErrorPage from "./ErrorPage";
import { getProfileImage } from "./Profiles/utils";
import { Button } from "./ui/button";

type NodeProps = { id: string; className?: string };

const Node = ({ id, className }: NodeProps) => {
  const { space } = useSpace();
  const { isGuest } = useUser();
  const { graphError, graphConnected, graphSynced, isLoading } = useNode();
  const [nodePage, setNodePage] = useQueryParam<string>("nodePage", withDefault(StringParam, ""), {
    removeDefaultsFromUrl: true,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", space?.id],
    queryFn: ({ signal }) => getSpaceProfile(signal, space?.id ?? ""),
    enabled: !!space?.id,
    retry: false,
  });

  if (graphError) return <ErrorPage error={graphError} />;
  if (!graphSynced || isLoading) return <Loader message="Loading canvas..." />;
  if (!graphConnected) return <Loader message="Obtaining connection to canvas..." />;

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "absolute top-0 z-20 flex h-9 leading-9 gap-2",
          isGuest ? "left-2" : "left-24",
        )}
      >
        <Link
          to={`/profiles/${profile?.profile_slug}`}
          className="text-black w-full font-normal hover:text-black flex items-center"
        >
          <Button
            variant="outline"
            className="h-9 border border-neutral-200 bg-white text-neutral-900 font-medium text-sm px-3 rounded flex items-center"
            data-tooltip-id="space-node-profile"
            data-tooltip-place="bottom"
            data-tooltip-content="Go to Space Profile"
            data-tooltip-class-name="text-xs py-1"
          >
            {/* <EditableNode id={id} /> */}
            {space && profile && (
              <>
                <img src={getProfileImage(profile)} className="size-4 rounded-full mr-2" />
                {space?.title}
              </>
            )}
          </Button>
        </Link>
        <Tooltip id="space-node-profile" />
        <Button
          variant="outline"
          className="size-9 p-0"
          onClick={() => setNodePage(nodePage == id ? "" : id)}
          data-tooltip-id="show-editor"
          data-tooltip-place="bottom"
        >
          <FileText strokeWidth={2.8} className="text-neutral-600 size-4" />
        </Button>
        <Tooltip id="show-editor">Node Page</Tooltip>

        {/* {node?.allowed_actions.includes("manage") && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 p-0 px-3">
                <Globe className="size-4 mr-2" />
                {node?.is_public ? "Public" : "Private"}
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 w-[400px]">
              <NodePermissions />
            </DialogContent>
          </Dialog>
        )} */}
      </div>
      <Graph />
    </div>
  );
};

const NodeOuter = ({ id, ...props }: NodeProps) => {
  return (
    <NodeProvider id={id}>
      <ReactFlowProvider>
        <Node id={id} {...props} />
      </ReactFlowProvider>
    </NodeProvider>
  );
};

export default NodeOuter;
