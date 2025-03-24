import { CanvasEdge, CanvasNode } from "@coordnet/core";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  EdgeAddChange,
  EdgeChange,
  EdgeRemoveChange,
  getConnectedEdges,
  NodeAddChange,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import { useCallback } from "react";

import { useCanvas, useYDoc } from "@/hooks";
import { YDocScope } from "@/types";

const isNodeAddChange = (change: NodeChange): change is NodeAddChange => change.type === "add";

const isEdgeAddChange = (change: EdgeChange): change is EdgeAddChange => change.type === "add";
const isEdgeRemoveChange = (change: EdgeChange): change is EdgeRemoveChange =>
  change.type === "remove";

function useYdocState(): [OnNodesChange<CanvasNode>, OnEdgesChange<CanvasEdge>, OnConnect] {
  const { parent, scope } = useYDoc();
  const {
    nodesMap,
    edgesMap,
    nodesSelection,
    setNodesSelection,
    edgesSelection,
    setEdgesSelection,
    inputNodes,
  } = useCanvas();

  // The onNodesChange callback updates nodesMap.
  // When the changes are applied to the map, the observer will be triggered and updates the nodes state.
  const onNodesChanges: OnNodesChange<CanvasNode> = useCallback(
    (changes) => {
      if (!nodesMap) return console.error("Nodes map is not initialized");
      if (!edgesMap) return console.error("Edges map is not initialized");
      const nodes = Array.from(nodesMap.values());

      const nextNodes = applyNodeChanges(changes, nodes);
      const newSelection = new Set([...nodesSelection]);
      changes.forEach((change: NodeChange) => {
        if (!isNodeAddChange(change)) {
          const node = nextNodes.find((n) => n.id === change.id);

          if (change.type == "select") {
            if (change.selected == true) {
              newSelection.add(change.id);
            } else {
              newSelection.delete(change.id);
            }
          } else if (
            node &&
            change.type !== "remove" &&
            (scope == YDocScope.READ_WRITE || inputNodes.includes(change.id))
          ) {
            nodesMap.set(change.id, node);
          } else if (
            change.type === "remove" &&
            (scope == YDocScope.READ_WRITE || inputNodes.includes(change.id))
          ) {
            const deletedNode = nodesMap.get(change.id);
            nodesMap.delete(change.id);
            // when a node is removed, we also need to remove the connected edges
            const edges = Array.from(edgesMap.values()).map((e) => e);
            const connectedEdges = getConnectedEdges(deletedNode ? [deletedNode] : [], edges);
            connectedEdges.forEach((edge) => edgesMap.delete(edge.id));
          }
        }
      });
      if (
        !(
          nodesSelection.size === newSelection.size &&
          [...nodesSelection].every((x) => newSelection.has(x))
        )
      ) {
        setNodesSelection(newSelection);
      }
    },
    [edgesMap, nodesMap, nodesSelection, scope, setNodesSelection]
  );

  const onEdgesChange: OnEdgesChange<CanvasEdge> = useCallback(
    (changes) => {
      if (scope !== YDocScope.READ_WRITE) return;
      if (!edgesMap) return console.error("Edges map is not initialized");
      const currentEdges = Array.from(edgesMap.values()).filter((e) => e);
      const nextEdges = applyEdgeChanges(changes, currentEdges);
      const newSelection = new Set([...edgesSelection]);
      changes.forEach((change: EdgeChange) => {
        if (isEdgeRemoveChange(change)) {
          edgesMap.delete(change.id);
        } else if (!isEdgeAddChange(change)) {
          if (change.type == "select") {
            if (change.selected == true) {
              newSelection.add(change.id);
            } else {
              newSelection.delete(change.id);
            }
          } else {
            edgesMap.set(change.id, nextEdges.find((n) => n.id === change.id) as CanvasEdge);
          }
        }
      });
      setEdgesSelection(newSelection);
    },
    [edgesMap, edgesSelection, parent.data]
  );

  const onConnect = useCallback(
    (params: Connection | CanvasEdge) => {
      const { source, sourceHandle, target, targetHandle } = params;
      const id = `edge-${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;

      edgesMap?.set(id, {
        id,
        ...params,
      } as CanvasEdge);
    },
    [edgesMap]
  );

  return [onNodesChanges, onEdgesChange, onConnect];
}

export default useYdocState;
