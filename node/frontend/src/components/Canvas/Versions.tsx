import { CanvasEdge, CanvasNode } from "@coordnet/core";
import { useQuery } from "@tanstack/react-query";
import { Background, ReactFlow, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format as formatTimeAgo } from "timeago.js";
import * as Y from "yjs";

import { api, getNodeVersions } from "@/api";
import { useCanvas, useYDoc } from "@/hooks";
import { NodeVersion } from "@/types";

import { Button } from "../ui/button";
import CanvasNodeComponent from "./Nodes/CanvasNode";
import ExternalNodeComponent from "./Nodes/ExternalNode";

const nodeTypes = { GraphNode: CanvasNodeComponent, ExternalNode: ExternalNodeComponent };

const LIMIT = 10;

const Versions = ({ className }: { className?: string }) => {
  const { parent } = useYDoc();
  const { nodesMap, edgesMap } = useCanvas();
  const [currentPage, setCurrentPage] = useState(0);
  const [currentVersion, setCurrentVersion] = useState<NodeVersion>();
  const [currentVersionYdoc, setCurrentVersionYdoc] = useState<Y.Doc>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [nodes, setNodesCanvas, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdgesCanvas, onEdgesChange] = useEdgesState<CanvasEdge>([]);
  const reactFlowInstance = useReactFlow();

  const {
    data: versions,
    isLoading,
    isFetched,
    isFetching,
  } = useQuery({
    queryKey: ["page-versions", parent.id, "GRAPH", currentPage],
    queryFn: ({ signal }) =>
      getNodeVersions(signal, parent.id, "GRAPH", currentPage * LIMIT, LIMIT),
    enabled: Boolean(parent.id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const revertVersion = () => {
    if (!currentVersionYdoc || !nodesMap || !edgesMap) return;
    const foundNodes = Array.from(currentVersionYdoc?.getMap("nodes").values()) as CanvasNode[];
    const foundEdges = Array.from(currentVersionYdoc?.getMap("edges").values()) as CanvasEdge[];
    nodesMap.clear();
    edgesMap.clear();
    foundNodes.forEach((node) => {
      nodesMap.set(node.id, node);
    });
    foundEdges.forEach((edge) => {
      edgesMap.set(edge.id, edge);
    });
    toast("Canvas updated to selected version");
  };

  useEffect(() => {
    if (currentVersion) {
      const loadVersion = async () => {
        if (!currentVersion) return;
        setDetailLoading(true);
        const url = "api/nodes/versions/" + currentVersion.id + "/crdt";
        const response = await api.get(url, { responseType: "arraybuffer" });
        const deserializedYDoc = new Y.Doc();
        setCurrentVersionYdoc(deserializedYDoc);
        Y.applyUpdate(deserializedYDoc, Y.mergeUpdates([new Uint8Array(response.data)]));
        const foundNodes = Array.from(deserializedYDoc.getMap("nodes").values()) as CanvasNode[];
        setNodesCanvas(foundNodes.map((node) => ({ ...node, selected: false })));
        setEdgesCanvas(Array.from(deserializedYDoc.getMap("edges").values()) as CanvasEdge[]);
        setDetailLoading(false);
      };

      loadVersion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersion]);

  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance, nodes]);

  useEffect(() => {
    if (isFetched && versions?.count > 0) {
      setCurrentVersion(versions.results[0]);
    }
  }, [isFetched, versions]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Loading... <Loader2Icon className="ml-3 size-4 animate-spin" />
      </div>
    );
  }
  if (isFetched && versions?.count == 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        No versions saved yet, they are saved every 5 minutes...
      </div>
    );
  }

  return (
    <div className={clsx("flex h-full overflow-auto", className)}>
      {detailLoading ? (
        <div className="flex flex-grow items-center justify-center">
          Loading... <Loader2Icon className="ml-3 size-4 animate-spin" />
        </div>
      ) : (
        <div className="Versions flex flex-grow flex-col">
          <div className="flex-grow">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              minZoom={0.1}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              attributionPosition="bottom-left"
            >
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
          <div>
            <Button variant="destructive" className="mt-2" onClick={() => revertVersion()}>
              Revert Canvas to this version
            </Button>
          </div>
        </div>
      )}
      <div className="relative flex flex-col" key={`versions-canvas-${currentPage}`}>
        {(isFetching || isLoading) && (
          <div
            className="absolute z-10 flex h-full w-[200px] items-center justify-center bg-white/50"
          >
            Loading <Loader2Icon className="ml-3 size-4 animate-spin" />
          </div>
        )}
        {versions?.results && (
          <>
            <div className="w-[200px] flex-grow overflow-auto">
              {versions.results.map((v) => (
                <div
                  key={v.id}
                  className={clsx("cursor-pointer border-b p-4 hover:bg-slate-50", {
                    "bg-neutral-100": currentVersion?.id === v.id,
                  })}
                  onClick={() => setCurrentVersion(v)}
                >
                  <div className="font-medium">{formatTimeAgo(v.created_at)}</div>
                  <div>{format(parseISO(v.created_at), "HH:mm - MMM dd yyyy")}</div>
                </div>
              ))}
            </div>
            <div className="ml-auto flex select-none">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                variant="ghost"
              >
                Previous
              </Button>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!versions?.next}
                variant="ghost"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Versions;
