import { useCallback, useEffect, useState } from "react";
import {
  applyEdgeChanges,
  Connection,
  EdgeAddChange,
  EdgeChange,
  EdgeRemoveChange,
  EdgeResetChange,
  OnConnect,
  OnEdgesChange,
} from "reactflow";

import useNode from "@/hooks/useNode";
import { GraphEdge } from "@/types";

const isEdgeAddChange = (change: EdgeChange): change is EdgeAddChange => change.type === "add";
const isEdgeResetChange = (change: EdgeChange): change is EdgeResetChange =>
  change.type === "reset";
const isEdgeRemoveChange = (change: EdgeChange): change is EdgeRemoveChange =>
  change.type === "remove";

function useNodesStateSynced(): [GraphEdge[], OnEdgesChange, OnConnect] {
  const { edgesMap } = useNode();

  const [edges, setEdges] = useState<GraphEdge[]>([]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const currentEdges = Array.from(edgesMap.values()).filter((e) => e);
    const nextEdges = applyEdgeChanges(changes, currentEdges);
    changes.forEach((change: EdgeChange) => {
      if (isEdgeRemoveChange(change)) {
        edgesMap.delete(change.id);
      } else if (!isEdgeAddChange(change) && !isEdgeResetChange(change)) {
        edgesMap.set(change.id, nextEdges.find((n) => n.id === change.id) as GraphEdge);
      }
    });
  }, []);

  const onConnect = useCallback((params: Connection | GraphEdge) => {
    const { source, sourceHandle, target, targetHandle } = params;
    const id = `edge-${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;

    edgesMap.set(id, {
      id,
      ...params,
    } as GraphEdge);
  }, []);

  useEffect(() => {
    const observer = () => {
      setEdges(Array.from(edgesMap.values()));
    };

    setEdges(Array.from(edgesMap.values()));
    edgesMap.observe(observer);

    return () => edgesMap.unobserve(observer);
  }, [setEdges]);

  return [edges, onEdgesChange, onConnect];
}

export default useNodesStateSynced;
