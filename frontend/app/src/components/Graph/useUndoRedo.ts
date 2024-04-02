import { useCallback, useEffect, useState } from "react";
import { Edge } from "reactflow";

import { useFocus } from "@/hooks";
import useNode from "@/hooks/useNode";
import { GraphNode } from "@/types";

// Defining the shape of the state stored in history
interface HistoryState {
  nodes: [string, GraphNode][];
  edges: [string, Edge][];
}

const MAX_HISTORY_SIZE = 100;

// The useUndoRedo hook
export const useUndoRedo = () => {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const { nodesMap, edgesMap } = useNode(); // Accessing Yjs maps
  const { focus } = useFocus();

  // Serialize the current state of the Yjs maps
  const serializeState = (): HistoryState => ({
    nodes: Array.from(nodesMap.entries()),
    edges: Array.from(edgesMap.entries()),
  });

  // Apply a previously saved state to the Yjs maps
  const applyState = (state: HistoryState) => {
    nodesMap.clear();
    edgesMap.clear();
    state.nodes.forEach(([key, value]) => nodesMap.set(key, value));
    state.edges.forEach(([key, value]) => edgesMap.set(key, value));
  };

  const takeSnapshot = useCallback(() => {
    const currentState = serializeState();
    setPast((past) => [...past.slice(-MAX_HISTORY_SIZE + 1), currentState]);
    setFuture([]);
  }, [nodesMap, edgesMap]);

  const undo = useCallback(() => {
    if (past.length > 0) {
      const previousState = past[past.length - 1];
      const currentState = serializeState();
      setPast(past.slice(0, -1));
      setFuture((future) => [...future, currentState]);
      applyState(previousState);
    }
  }, [past, nodesMap, edgesMap]);

  const redo = useCallback(() => {
    if (future.length > 0) {
      const nextState = future[future.length - 1];
      const currentState = serializeState();
      setFuture(future.slice(0, -1));
      setPast((past) => [...past, currentState]);
      applyState(nextState);
    }
  }, [future, nodesMap, edgesMap]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (focus !== "graph") return;

      if (event.key === "z" && (event.ctrlKey || event.metaKey) && event.shiftKey) {
        redo();
      } else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
        undo();
      }
    };

    document.addEventListener("keydown", keyDownHandler);
    return () => document.removeEventListener("keydown", keyDownHandler);
  }, [undo, redo, focus]);

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: !past.length,
    canRedo: !future.length,
  };
};

export default useUndoRedo;
