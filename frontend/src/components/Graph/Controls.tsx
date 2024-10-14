import "reactflow/dist/style.css";
import "./react-flow.css";

import { useQuery } from "@tanstack/react-query";
import { History, Map, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { MiniMap, Panel, ReactFlowProvider, useReactFlow } from "reactflow";
import { format as formatTimeAgo } from "timeago.js";
import useLocalStorageState from "use-local-storage-state";

import { getNodeVersions } from "@/api";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useNode } from "@/hooks";

import { Button } from "../ui/button";
import Versions from "./Versions";

const Controls = () => {
  const { id, node } = useNode();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [miniMapVisible, setMiniMapVisible] = useLocalStorageState("coordnet:miniMapVisible", {
    defaultValue: true,
  });

  const { data: versions } = useQuery({
    queryKey: ["page-versions", id, "GRAPH", "latest"],
    queryFn: ({ signal }) => getNodeVersions(signal, id, "GRAPH", 0, 1),
    enabled: Boolean(node?.allowed_actions.includes("write")),
    initialData: { count: 0, next: "", previous: "", results: [] },
    refetchInterval: 1000 * 60,
    retry: false,
  });

  return (
    <>
      <Panel position="bottom-right" className="flex gap-1 !bottom-2 !right-2 !m-0">
        <Button className="size-9 p-0" variant="outline" onClick={() => zoomIn()}>
          <ZoomIn className="size-5" />
        </Button>
        <Button className="size-9 p-0" variant="outline" onClick={() => zoomOut()}>
          <ZoomOut className="size-5" />
        </Button>
        <Button className="size-9 p-0" variant="outline" onClick={() => fitView()}>
          <Maximize className="size-5" />
        </Button>
        <Button
          className="size-9 p-0"
          variant="outline"
          onClick={() => setMiniMapVisible(!miniMapVisible)}
        >
          <Map className="size-5" />
        </Button>
      </Panel>
      {node?.allowed_actions.includes("write") && (
        <Panel position="bottom-left" className="flex gap-1 !bottom-2 !left-2 !m-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="size-9 p-0" variant="outline">
                <History className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-4/5 max-w-4/5 h-4/5 max-h-4/5 overflow-hidden">
              <ReactFlowProvider>
                <Versions />
              </ReactFlowProvider>
            </DialogContent>
          </Dialog>
          {Boolean(versions?.results?.length) && (
            <div className="text-xs text-gray-700 self-end ml-2">
              Saved {formatTimeAgo(versions.results[0].created_at)}
            </div>
          )}
        </Panel>
      )}
      {miniMapVisible && <MiniMap pannable={true} className="!bottom-12 !right-2 !m-0 !mb-1" />}
    </>
  );
};

export default Controls;
