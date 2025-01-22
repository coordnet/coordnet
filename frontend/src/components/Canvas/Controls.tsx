import { useQuery } from "@tanstack/react-query";
import { History, Map, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { MiniMap, Panel, ReactFlowProvider, useReactFlow } from "reactflow";
import { format as formatTimeAgo } from "timeago.js";
import useLocalStorageState from "use-local-storage-state";

import { getNodeVersions } from "@/api";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useCanvas, useYDoc } from "@/hooks";
import { BackendEntityType, YDocScope } from "@/types";

import { Button } from "../ui/button";
import Versions from "./Versions";

const Controls = () => {
  const { id } = useCanvas();
  const { parent, scope } = useYDoc();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [miniMapVisible, setMiniMapVisible] = useLocalStorageState("coordnet:miniMapVisible", {
    defaultValue: true,
  });

  const isSkill = parent.type === BackendEntityType.SKILL;

  const { data: versions } = useQuery({
    queryKey: ["page-versions", id, "GRAPH", "latest"],
    queryFn: ({ signal }) => getNodeVersions(signal, parent.id, "GRAPH", 0, 1),
    enabled: Boolean(parent?.type == BackendEntityType.SPACE && scope == YDocScope.READ_WRITE),
    initialData: { count: 0, next: "", previous: "", results: [] },
    refetchInterval: 1000 * 60,
    retry: false,
  });

  return (
    <>
      <Panel position="bottom-right" className="!bottom-2 !right-2 !m-0 flex gap-1">
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
      {parent.type == BackendEntityType.SPACE && scope == YDocScope.READ_WRITE && (
        <Panel position="bottom-left" className="!bottom-2 !left-2 !m-0 flex gap-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="size-9 p-0" variant="outline">
                <History className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4/5 max-h-4/5 h-4/5 w-4/5 overflow-hidden">
              <ReactFlowProvider>
                <Versions />
              </ReactFlowProvider>
            </DialogContent>
          </Dialog>
          {Boolean(versions?.results?.length) && (
            <div className="ml-2 self-end text-xs text-gray-700">
              Saved {formatTimeAgo(versions.results[0].created_at)}
            </div>
          )}
        </Panel>
      )}
      {miniMapVisible && !isSkill && (
        <MiniMap pannable={true} className="!bottom-12 !right-2 !m-0 !mb-1" />
      )}
    </>
  );
};

export default Controls;
