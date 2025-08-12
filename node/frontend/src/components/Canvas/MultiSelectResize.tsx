import { CanvasNode } from "@coordnet/core";
import { useCallback, useState } from "react";

// Remove unused interface

export const useMultiSelectResize = () => {
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);

  const startMultiSelect = useCallback((startX: number, startY: number) => {
    setIsMultiSelecting(true);
    setSelectionBox({ startX, startY, endX: startX, endY: startY });
  }, []);

  const updateSelectionBox = useCallback((endX: number, endY: number) => {
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX, endY });
    }
  }, [selectionBox]);

  const endMultiSelect = useCallback(() => {
    setIsMultiSelecting(false);
    setSelectionBox(null);
  }, []);

  const getNodesInSelectionBox = useCallback(
    (nodes: CanvasNode[], box: { startX: number; startY: number; endX: number; endY: number }) => {
      const left = Math.min(box.startX, box.endX);
      const right = Math.max(box.startX, box.endX);
      const top = Math.min(box.startY, box.endY);
      const bottom = Math.max(box.startY, box.endY);

      return nodes.filter((node) => {
        const nodeLeft = node.position.x;
        const nodeRight = node.position.x + (node.width || 150);
        const nodeTop = node.position.y;
        const nodeBottom = node.position.y + (node.height || 100);

        return (
          nodeLeft < right &&
          nodeRight > left &&
          nodeTop < bottom &&
          nodeBottom > top
        );
      });
    },
    []
  );

  const resizeSelectedNodes = useCallback(
    (
      selectedNodes: CanvasNode[],
      resizeDirection: "width" | "height" | "both",
      newSize: { width?: number; height?: number }
    ) => {
      return selectedNodes.map((node) => ({
        ...node,
        width: resizeDirection === "width" || resizeDirection === "both"
          ? newSize.width || node.width
          : node.width,
        height: resizeDirection === "height" || resizeDirection === "both"
          ? newSize.height || node.height
          : node.height,
      }));
    },
    []
  );

  const moveSelectedNodes = useCallback(
    (selectedNodes: CanvasNode[], deltaX: number, deltaY: number) => {
      return selectedNodes.map((node) => ({
        ...node,
        position: {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY,
        },
      }));
    },
    []
  );

  const selectNode = useCallback((nodeId: string, addToSelection: boolean = false) => {
    if (addToSelection) {
      setSelectedNodes(prev => prev.includes(nodeId) ? prev : [...prev, nodeId]);
    } else {
      setSelectedNodes([nodeId]);
    }
  }, []);

  const deselectNode = useCallback((nodeId: string) => {
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodes([]);
  }, []);

  const startResize = useCallback((direction: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    setIsResizing(true);
    setResizeDirection(direction);
  }, []);

  const endResize = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
  }, []);

  const alignSelectedNodes = useCallback((alignment: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle') => {
    if (selectedNodes.length < 2) return;

    // Implementation for aligning selected nodes
    console.log(`Aligning nodes to ${alignment}`);
  }, [selectedNodes]);

  const distributeSelectedNodes = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 3) return;

    // Implementation for distributing selected nodes
    console.log(`Distributing nodes ${direction}ly`);
  }, [selectedNodes]);

  return {
    isMultiSelecting,
    selectedNodes,
    selectionBox,
    isResizing,
    resizeDirection,
    startMultiSelect,
    updateSelectionBox,
    endMultiSelect,
    selectNode,
    deselectNode,
    clearSelection,
    startResize,
    endResize,
    alignSelectedNodes,
    distributeSelectedNodes,
    getNodesInSelectionBox,
    resizeSelectedNodes,
    moveSelectedNodes,
  };
};

export const MultiSelectOverlay = ({
  selectionBox,
  selectedNodes = [],
  isResizing = false
}: {
  selectionBox: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  selectedNodes?: string[];
  isResizing?: boolean;
}) => {
  if (!selectionBox) return null;

  const left = Math.min(selectionBox.startX, selectionBox.endX);
  const top = Math.min(selectionBox.startY, selectionBox.endY);
  const width = Math.abs(selectionBox.endX - selectionBox.startX);
  const height = Math.abs(selectionBox.endY - selectionBox.startY);

  return (
    <>
      {/* Selection Box */}
      <div
        className={`absolute border-2 pointer-events-none z-40 ${
          isResizing
            ? 'border-orange-500 bg-orange-100 bg-opacity-30'
            : 'border-blue-500 bg-blue-100 bg-opacity-20'
        }`}
        style={{
          left,
          top,
          width,
          height,
        }}
      />

      {/* Selection Count Badge */}
      {selectedNodes.length > 0 && (
        <div
          className="absolute bg-blue-600 text-white text-xs px-2 py-1 rounded-full pointer-events-none z-50"
          style={{
            left: left + width + 5,
            top: top - 25,
          }}
        >
          {selectedNodes.length} selected
        </div>
      )}
    </>
  );
};
