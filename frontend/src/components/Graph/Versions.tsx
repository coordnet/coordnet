import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import ReactFlow, { Background, useEdgesState, useNodesState, useReactFlow } from "reactflow";
import { toast } from "sonner";
import { format as formatTimeAgo } from "timeago.js";
import * as Y from "yjs";

import { api, getNodeVersions } from "@/api";
import { useNode } from "@/hooks";
import { GraphEdge, GraphNode, NodeVersion } from "@/types";

import { Button } from "../ui/button";
import GraphNodeComponent from "./GraphNode";

const nodeTypes = {
  GraphNode: GraphNodeComponent,
};

const LIMIT = 10;

const Versions = ({ className }: { className?: string }) => {
  const { id, nodesMap, edgesMap } = useNode();
  const [currentPage, setCurrentPage] = useState(0);
  const [currentVersion, setCurrentVersion] = useState<NodeVersion>();
  const [currentVersionYdoc, setCurrentVersionYdoc] = useState<Y.Doc>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [nodes, setNodesGraph, onNodesChange] = useNodesState([]);
  const [edges, setEdgesGraph, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();

  const {
    data: versions,
    isLoading,
    isFetched,
    isFetching,
  } = useQuery({
    queryKey: ["page-versions", id, "GRAPH", currentPage],
    queryFn: ({ signal }) => getNodeVersions(signal, id, "GRAPH", currentPage * LIMIT, LIMIT),
    enabled: Boolean(id),
    initialData: { count: 0, next: "", previous: "", results: [] },
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const revertVersion = () => {
    if (!currentVersionYdoc || !nodesMap || !edgesMap) return;
    const foundNodes = Array.from(currentVersionYdoc?.getMap("nodes").values()) as GraphNode[];
    const foundEdges = Array.from(currentVersionYdoc?.getMap("edges").values()) as GraphEdge[];
    nodesMap.clear();
    edgesMap.clear();
    foundNodes.forEach((node) => {
      nodesMap.set(node.id, node);
    });
    foundEdges.forEach((edge) => {
      edgesMap.set(edge.id, edge);
    });
    toast("Graph updated to selected version");
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
        const foundNodes = Array.from(deserializedYDoc.getMap("nodes").values()) as GraphNode[];
        setNodesGraph(foundNodes.map((node) => ({ ...node, selected: false })));
        setEdgesGraph(Array.from(deserializedYDoc.getMap("edges").values()) as GraphEdge[]);
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
      <div className="w-full h-full flex items-center justify-center">
        Loading... <Loader2Icon className="animate-spin size-4 ml-3" />
      </div>
    );
  }
  if (isFetched && versions?.count == 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        No versions saved yet, they are saved every 5 minutes...
      </div>
    );
  }

  return (
    <div className={clsx("h-full overflow-auto flex", className)}>
      {detailLoading ? (
        <div className="flex-grow flex items-center justify-center">
          Loading... <Loader2Icon className="animate-spin size-4 ml-3" />
        </div>
      ) : (
        <div className="flex-grow Versions flex flex-col">
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
              Revert Graph to this version
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col relative" key={`versions-graph-${currentPage}`}>
        {(isFetching || isLoading) && (
          <div className="w-[200px] absolute bg-white/50 h-full flex items-center justify-center z-10">
            Loading <Loader2Icon className="animate-spin size-4 ml-3" />
          </div>
        )}
        {versions?.results && (
          <>
            <div className="w-[200px] overflow-auto flex-grow">
              {versions.results.map((v) => (
                <div
                  key={v.id}
                  className={clsx("border-b p-4 cursor-pointer hover:bg-slate-50", {
                    "bg-neutral-100": currentVersion?.id === v.id,
                  })}
                  onClick={() => setCurrentVersion(v)}
                >
                  <div className="font-medium">{formatTimeAgo(v.created_at)}</div>
                  <div>{format(parseISO(v.created_at), "HH:mm - MMM dd yyyy")}</div>
                </div>
              ))}
            </div>
            <div className="flex ml-auto select-none">
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
