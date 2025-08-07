import { CanvasNode } from "@coordnet/core";
import { useCallback } from "react";

export interface AutoAlignmentOptions {
  enabled: boolean;
  mode: "horizontal" | "vertical" | "grid";
  spacing: number;
  startPosition: { x: number; y: number };
}

export const useAutoAlignment = () => {
  const calculateHorizontalAlignment = useCallback(
    (existingNodes: CanvasNode[], options: AutoAlignmentOptions) => {
      const sortedNodes = existingNodes.sort((a, b) => a.position.x - b.position.x);
      const lastNode = sortedNodes[sortedNodes.length - 1];
      
      return {
        x: lastNode.position.x + 200 + options.spacing, // 200 is approximate node width
        y: options.startPosition.y,
      };
    },
    []
  );

  const calculateVerticalAlignment = useCallback(
    (existingNodes: CanvasNode[], options: AutoAlignmentOptions) => {
      // For vertical alignment, sort by X position (horizontal arrangement)
      const sortedNodes = existingNodes.sort((a, b) => a.position.x - b.position.x);
      const lastNode = sortedNodes[sortedNodes.length - 1];
      
      // Get actual box width from the last node or use default
      const lastNodeWidth = Number(lastNode?.measured?.width || lastNode?.style?.width || 200); // Default to 200px
      
      // Position next node horizontally (same Y level)
      const baseX = lastNode?.position.x ?? options.startPosition.x;
      const nextX = baseX + lastNodeWidth + options.spacing;
      
      return {
        x: nextX,
        y: options.startPosition.y, // Keep same Y position for vertical alignment
      };
    },
    []
  );

  const calculateGridAlignment = useCallback(
    (existingNodes: CanvasNode[], options: AutoAlignmentOptions) => {
      const nodesPerRow = 3; // Nodes per row in grid
      
      // Calculate average node dimensions for positioning
      const avgNodeWidth = existingNodes.length > 0 
        ? existingNodes.reduce((sum, node) => sum + Number(node.measured?.width || node.style?.width || 200), 0) / existingNodes.length
        : 200;
      const avgNodeHeight = existingNodes.length > 0
        ? existingNodes.reduce((sum, node) => sum + Number(node.measured?.height || node.style?.height || 80), 0) / existingNodes.length  
        : 80;
      
      const nodeCount = existingNodes.length;
      const row = Math.floor(nodeCount / nodesPerRow);
      const col = nodeCount % nodesPerRow;
      
      return {
        x: options.startPosition.x + col * (avgNodeWidth + options.spacing),
        y: options.startPosition.y + row * (avgNodeHeight + options.spacing),
      };
    },
    []
  );

  const alignMultipleNodes = useCallback(
    (nodesToAlign: CanvasNode[], options: AutoAlignmentOptions): CanvasNode[] => {
      if (!options.enabled || nodesToAlign.length === 0) return nodesToAlign;

      const alignedNodes = [...nodesToAlign];
      
      switch (options.mode) {
        case "horizontal":
          alignedNodes.forEach((node, index) => {
            node.position.x = options.startPosition.x + index * (200 + options.spacing);
            node.position.y = options.startPosition.y;
          });
          break;
        case "vertical": {
          // For vertical alignment, position nodes horizontally at the same Y level
          // Calculate total width using actual node sizes for proper centering
          let totalWidth = 0;
          const nodeWidths = alignedNodes.map(node => {
            const width = Number(node.measured?.width || node.style?.width || 200); // Use actual box size
            totalWidth += width;
            return width;
          });
          totalWidth += (alignedNodes.length - 1) * options.spacing;
          
          const startX = options.startPosition.x - (totalWidth / 2); // Center around the start position
          
          let currentX = startX;
          alignedNodes.forEach((node, index) => {
            node.position.x = currentX;
            node.position.y = options.startPosition.y; // Same Y position for all nodes
            currentX += nodeWidths[index] + options.spacing;
          });
          break;
        }
        case "grid": {
          alignedNodes.forEach((node, index) => {
            const nodesPerRow = 3;
            const row = Math.floor(index / nodesPerRow);
            const col = index % nodesPerRow;
            
            // Use actual node dimensions
            const nodeWidth = Number(node.measured?.width || node.style?.width || 200);
            const nodeHeight = Number(node.measured?.height || node.style?.height || 80);
            
            node.position.x = options.startPosition.x + col * (nodeWidth + options.spacing);
            node.position.y = options.startPosition.y + row * (nodeHeight + options.spacing);
          });
          break;
        }
      }

      return alignedNodes;
    },
    []
  );

  const calculateAutoAlignment = useCallback(
    (
      nodes: CanvasNode[],
      newNodePosition: { x: number; y: number },
      options: AutoAlignmentOptions
    ): { x: number; y: number } => {
      if (!options.enabled) return newNodePosition;

      const existingNodes = nodes.filter((node) => node.id !== "temp-new-node");
      
      if (existingNodes.length === 0) {
        return options.startPosition;
      }

      switch (options.mode) {
        case "horizontal":
          return calculateHorizontalAlignment(existingNodes, options);
        case "vertical":
          return calculateVerticalAlignment(existingNodes, options);
        case "grid":
          return calculateGridAlignment(existingNodes, options);
        default:
          return newNodePosition;
      }
    },
    [calculateHorizontalAlignment, calculateVerticalAlignment, calculateGridAlignment]
  );

  return {
    calculateAutoAlignment,
    alignMultipleNodes,
  };
}; 