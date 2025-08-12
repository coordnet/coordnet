import { CanvasNode } from "@coordnet/core";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState, useRef } from "react";

interface AlignmentGuide {
  id: string;
  type:
    | "horizontal"
    | "vertical"
    | "center-horizontal"
    | "center-vertical"
    | "edge-top"
    | "edge-bottom"
    | "edge-left"
    | "edge-right"
    | "diagonal";
  position: number;
  start: number;
  end: number;
  strength: number; // 0-1 for animation intensity
  isSnapping: boolean;
  distance?: number;
  label?: string;
  // For diagonal guides
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  angle?: number;
}

interface SmartGuide {
  id: string;
  type: "spacing" | "alignment" | "margin";
  nodes: string[];
  measurement: number;
  position: { start: { x: number; y: number }; end: { x: number; y: number } };
  label: string;
  color: string;
}

interface AlignmentGuidesProps {
  nodes: CanvasNode[];
  draggingNodeId?: string;
  isDragging: boolean;
  snapThreshold?: number;
  enableHapticFeedback?: boolean;
  enableSmartGuides?: boolean;
  enableSpacingGuides?: boolean;
  showMeasurements?: boolean;
  enableAdvancedAlignment?: boolean;
  enableCenterSnapping?: boolean;
  enableDiagonalGuides?: boolean;
  enableDistanceMeasurements?: boolean;
}

const DEFAULT_SNAP_THRESHOLD = 8; // pixels - more sensitive
const GUIDE_COLOR = "#3b82f6";
const GUIDE_WIDTH = 2;
// Removed jarring red snap color - keeping soft colors only
const CENTER_SNAP_COLOR = "#10b981"; // Green for center snapping

const SPACING_GUIDE_COLOR = "#f59e0b"; // Amber for spacing
const DIAGONAL_GUIDE_COLOR = "#8b5cf6"; // Purple for diagonal guides
const DISTANCE_GUIDE_COLOR = "#ec4899"; // Pink for distance measurements
// const MARGIN_GUIDE_COLOR = "#8b5cf6"; // Purple for margins - Reserved for future use
const DESKTOP_PRECISION_THRESHOLD = 1; // Higher precision for desktop
const CENTER_SNAP_THRESHOLD = 15; // Larger threshold for center snapping
const DIAGONAL_SNAP_ANGLES = [30, 45, 60, 90, 120, 135, 150]; // Common diagonal angles
const DIAGONAL_ANGLE_THRESHOLD = 5; // Degrees threshold for diagonal snapping
const MAX_GUIDES = 15; // Limit total number of guides for performance
const MAX_DISTANCE_GUIDES = 8; // Limit distance guides specifically

export const AlignmentGuides = ({
  nodes,
  draggingNodeId,
  isDragging,
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
  enableHapticFeedback = true,
  enableSmartGuides = true,
  enableSpacingGuides = true,
  showMeasurements = true,
  enableAdvancedAlignment = true,
  enableCenterSnapping = true,
  enableDiagonalGuides = true,
  enableDistanceMeasurements = false,
}: AlignmentGuidesProps) => {
  const { getNode, getViewport } = useReactFlow();
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const lastSnapTime = useRef<number>(0);
  // const [hoveredGuide, setHoveredGuide] = useState<string | null>(null); // Reserved for future hover interactions
  const [keyboardModifiers, setKeyboardModifiers] = useState({
    shift: false,
    ctrl: false,
    alt: false,
  });

  const calculateNodeBounds = useCallback(
    (node: CanvasNode) => {
      const reactFlowNode = getNode(node.id);
      if (!reactFlowNode) return null;

      const { position } = reactFlowNode;

      // Use the actual measured dimensions from the CanvasNode, fallback to ReactFlow dimensions, then defaults
      const width = node.measured?.width || reactFlowNode.width || 150;
      const height = node.measured?.height || reactFlowNode.height || 100;

      return {
        left: position.x,
        right: position.x + width,
        top: position.y,
        bottom: position.y + height,
        centerX: position.x + width / 2,
        centerY: position.y + height / 2,
      };
    },
    [getNode],
  );

  // Enhanced keyboard event handling for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeyboardModifiers((prev) => ({
        ...prev,
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeyboardModifiers((prev) => ({
        ...prev,
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
      }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize viewport state and track changes
  useEffect(() => {
    // Initialize viewport
    setViewport(getViewport());

    // Set up event listeners for viewport changes
    const updateViewportState = () => {
      setViewport(getViewport());
    };

    // Listen for various events that could change the viewport
    const canvasElement = document.querySelector(".react-flow__viewport");
    if (canvasElement) {
      // Listen for transform changes
      const observer = new MutationObserver(() => {
        updateViewportState();
      });

      observer.observe(canvasElement, {
        attributes: true,
        attributeFilter: ["style", "transform"],
      });

      return () => observer.disconnect();
    }
  }, [getViewport]);

  // Track viewport changes during dragging
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number;
    let lastViewport = getViewport();

    const updateViewport = () => {
      const currentViewport = getViewport();

      // Update if viewport changed
      if (
        currentViewport.x !== lastViewport.x ||
        currentViewport.y !== lastViewport.y ||
        currentViewport.zoom !== lastViewport.zoom
      ) {
        setViewport(currentViewport);
        lastViewport = currentViewport;
      }

      // Continue monitoring while dragging
      if (isDragging) {
        animationFrameId = requestAnimationFrame(updateViewport);
      }
    };

    updateViewport();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getViewport, isDragging]);

  // Helper functions for coordinate conversion
  const getVisibleBounds = useCallback(() => {
    const vp = getViewport();

    // Calculate the visible area in flow coordinates
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Convert screen coordinates to flow coordinates
    const topLeft = {
      x: -vp.x / vp.zoom,
      y: -vp.y / vp.zoom,
    };

    const bottomRight = {
      x: (viewportWidth - vp.x) / vp.zoom,
      y: (viewportHeight - vp.y) / vp.zoom,
    };

    return {
      left: topLeft.x - 200, // Add padding
      right: bottomRight.x + 200,
      top: topLeft.y - 200,
      bottom: bottomRight.y + 200,
    };
  }, [getViewport]);

  // Enhanced spacing detection for smart guides
  const findSpacingGuides = useCallback(
    (draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
      if (!enableSpacingGuides) return [];

      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const spacingGuides: SmartGuide[] = [];

      // Find consistent spacing patterns
      const sortedNodes = otherNodes
        .map((node) => ({ node, bounds: calculateNodeBounds(node) }))
        .filter((item) => item.bounds)
        .sort((a, b) => a.bounds!.left - b.bounds!.left);

      for (let i = 0; i < sortedNodes.length - 1; i++) {
        const current = sortedNodes[i].bounds!;
        const next = sortedNodes[i + 1].bounds!;
        const spacing = next.left - current.right;

        // Check if dragging node would create consistent spacing
        const dragToCurrentSpacing = Math.abs(draggingBounds.left - current.right - spacing);
        const dragFromNextSpacing = Math.abs(next.left - draggingBounds.right - spacing);

        if (dragToCurrentSpacing < snapThreshold) {
          spacingGuides.push({
            id: `spacing-${i}`,
            type: "spacing",
            nodes: [sortedNodes[i].node.id, draggingNode.id],
            measurement: spacing,
            position: {
              start: { x: current.right, y: current.centerY },
              end: { x: current.right + spacing, y: current.centerY },
            },
            label: `${spacing.toFixed(0)}px`,
            color: SPACING_GUIDE_COLOR,
          });
        }

        if (dragFromNextSpacing < snapThreshold) {
          spacingGuides.push({
            id: `spacing-${i}-next`,
            type: "spacing",
            nodes: [draggingNode.id, sortedNodes[i + 1].node.id],
            measurement: spacing,
            position: {
              start: { x: draggingBounds.right, y: draggingBounds.centerY },
              end: { x: draggingBounds.right + spacing, y: draggingBounds.centerY },
            },
            label: `${spacing.toFixed(0)}px`,
            color: SPACING_GUIDE_COLOR,
          });
        }
      }

      return spacingGuides;
    },
    [calculateNodeBounds, enableSpacingGuides, snapThreshold],
  );

  // Diagonal guides detection
  const findDiagonalGuides = useCallback(
    (draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
      if (!enableDiagonalGuides) return [];

      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const diagonalGuides: AlignmentGuide[] = [];

      otherNodes.forEach((otherNode) => {
        const otherBounds = calculateNodeBounds(otherNode);
        if (!otherBounds) return;

        const deltaX = draggingBounds.centerX - otherBounds.centerX;
        const deltaY = draggingBounds.centerY - otherBounds.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Only create diagonal guides for nodes that are reasonably far apart
        if (distance < 50) return;

        const actualAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const normalizedAngle = ((actualAngle % 360) + 360) % 360;

        DIAGONAL_SNAP_ANGLES.forEach((targetAngle) => {
          const angleDiff = Math.min(
            Math.abs(normalizedAngle - targetAngle),
            Math.abs(normalizedAngle - targetAngle + 360),
            Math.abs(normalizedAngle - targetAngle - 360),
          );

          if (angleDiff < DIAGONAL_ANGLE_THRESHOLD) {
            const strength = 1 - angleDiff / DIAGONAL_ANGLE_THRESHOLD;
            const isSnapping = angleDiff < 2;

            const radians = targetAngle * (Math.PI / 180);
            const length = 400; // Length of the diagonal guide line

            diagonalGuides.push({
              id: `diagonal-${otherNode.id}-${targetAngle}`,
              type: "diagonal",
              position: 0, // Not used for diagonal
              start: 0, // Not used for diagonal
              end: 0, // Not used for diagonal
              startX: otherBounds.centerX - (Math.cos(radians) * length) / 2,
              startY: otherBounds.centerY - (Math.sin(radians) * length) / 2,
              endX: otherBounds.centerX + (Math.cos(radians) * length) / 2,
              endY: otherBounds.centerY + (Math.sin(radians) * length) / 2,
              angle: targetAngle,
              strength,
              isSnapping,
              label: showMeasurements ? `${targetAngle}°` : undefined,
            });
          }
        });
      });

      return diagonalGuides;
    },
    [calculateNodeBounds, enableDiagonalGuides, showMeasurements],
  );

  // Distance measurement guides
  const findDistanceGuides = useCallback(
    (draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
      if (!enableDistanceMeasurements) return [];

      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const distanceGuides: SmartGuide[] = [];

      // Sort nodes by distance to prioritize closer ones
      const sortedNodes = otherNodes
        .map((node) => {
          const bounds = calculateNodeBounds(node);
          return {
            node,
            bounds,
            distance: bounds
              ? Math.sqrt(
                  Math.pow(draggingBounds.centerX - bounds.centerX, 2) +
                    Math.pow(draggingBounds.centerY - bounds.centerY, 2),
                )
              : Infinity,
          };
        })
        .filter((item) => item.bounds)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_DISTANCE_GUIDES); // Limit for performance

      sortedNodes.forEach(({ node: otherNode, bounds: otherBounds }) => {
        if (!otherBounds) return;

        // Calculate edge-to-edge distances
        const horizontalGap = Math.min(
          Math.abs(draggingBounds.left - otherBounds.right), // Left edge to right edge
          Math.abs(draggingBounds.right - otherBounds.left), // Right edge to left edge
        );

        const verticalGap = Math.min(
          Math.abs(draggingBounds.top - otherBounds.bottom), // Top edge to bottom edge
          Math.abs(draggingBounds.bottom - otherBounds.top), // Bottom edge to top edge
        );

        // Show horizontal distance (gap between nodes horizontally)
        if (horizontalGap > 0 && horizontalGap < 500) {
          const isLeftToRight = draggingBounds.left > otherBounds.right;
          const startX = isLeftToRight ? otherBounds.right : otherBounds.left;
          const endX = isLeftToRight ? draggingBounds.left : draggingBounds.right;
          const midY = (draggingBounds.centerY + otherBounds.centerY) / 2;

          distanceGuides.push({
            id: `h-distance-${otherNode.id}`,
            type: "spacing",
            nodes: [draggingNode.id, otherNode.id],
            measurement: horizontalGap,
            position: {
              start: { x: startX, y: midY },
              end: { x: endX, y: midY },
            },
            label: `${Math.round(horizontalGap)}px`,
            color: DISTANCE_GUIDE_COLOR,
          });
        }

        // Show vertical distance (gap between nodes vertically)
        if (verticalGap > 0 && verticalGap < 500) {
          const isTopToBottom = draggingBounds.top > otherBounds.bottom;
          const startY = isTopToBottom ? otherBounds.bottom : otherBounds.top;
          const endY = isTopToBottom ? draggingBounds.top : draggingBounds.bottom;
          const midX = (draggingBounds.centerX + otherBounds.centerX) / 2;

          distanceGuides.push({
            id: `v-distance-${otherNode.id}`,
            type: "spacing",
            nodes: [draggingNode.id, otherNode.id],
            measurement: verticalGap,
            position: {
              start: { x: midX, y: startY },
              end: { x: midX, y: endY },
            },
            label: `${Math.round(verticalGap)}px`,
            color: DISTANCE_GUIDE_COLOR,
          });
        }

        // Show center-to-center distance (diagonal)
        const centerDistance = Math.sqrt(
          Math.pow(draggingBounds.centerX - otherBounds.centerX, 2) +
            Math.pow(draggingBounds.centerY - otherBounds.centerY, 2),
        );

        // Only show center distance if nodes are reasonably far apart
        if (centerDistance > 100 && centerDistance < 600) {
          distanceGuides.push({
            id: `center-distance-${otherNode.id}`,
            type: "spacing",
            nodes: [draggingNode.id, otherNode.id],
            measurement: centerDistance,
            position: {
              start: { x: otherBounds.centerX, y: otherBounds.centerY },
              end: { x: draggingBounds.centerX, y: draggingBounds.centerY },
            },
            label: `${Math.round(centerDistance)}px`,
            color: "#6366f1", // Indigo for center distances
          });
        }
      });

      return distanceGuides;
    },
    [calculateNodeBounds, enableDistanceMeasurements],
  );

  // Center snapping detection (snap to canvas origin 0,0)
  const findCenterSnapping = useCallback(
    (draggingNode: CanvasNode) => {
      if (!enableCenterSnapping) return [];

      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const guides: AlignmentGuide[] = [];

      // Check distance to center origin (0,0)
      const distanceToHorizontalCenter = Math.abs(draggingBounds.centerX);
      const distanceToVerticalCenter = Math.abs(draggingBounds.centerY);
      const distanceToLeftEdge = Math.abs(draggingBounds.left);
      const distanceToTopEdge = Math.abs(draggingBounds.top);

      // Get viewport-aware bounds for guide extents
      const visibleBounds = getVisibleBounds();

      // Extend bounds to ensure guides are visible
      const extendedBounds = {
        left: visibleBounds.left,
        right: visibleBounds.right,
        top: visibleBounds.top,
        bottom: visibleBounds.bottom,
      };

      // Vertical center line (x = 0)
      if (distanceToHorizontalCenter < CENTER_SNAP_THRESHOLD) {
        const strength = 1 - distanceToHorizontalCenter / CENTER_SNAP_THRESHOLD;
        const isSnapping = distanceToHorizontalCenter < 3;
        guides.push({
          id: "center-vertical",
          type: "center-vertical",
          position: 0,
          start: extendedBounds.top,
          end: extendedBounds.bottom,
          strength,
          isSnapping,
          distance: distanceToHorizontalCenter,
          label: showMeasurements
            ? `Center X: ${distanceToHorizontalCenter.toFixed(1)}px`
            : undefined,
        });
      }

      // Horizontal center line (y = 0)
      if (distanceToVerticalCenter < CENTER_SNAP_THRESHOLD) {
        const strength = 1 - distanceToVerticalCenter / CENTER_SNAP_THRESHOLD;
        const isSnapping = distanceToVerticalCenter < 3;
        guides.push({
          id: "center-horizontal",
          type: "center-horizontal",
          position: 0,
          start: extendedBounds.left,
          end: extendedBounds.right,
          strength,
          isSnapping,
          distance: distanceToVerticalCenter,
          label: showMeasurements
            ? `Center Y: ${distanceToVerticalCenter.toFixed(1)}px`
            : undefined,
        });
      }

      // Left edge to origin (x = 0)
      if (
        distanceToLeftEdge < CENTER_SNAP_THRESHOLD &&
        distanceToLeftEdge < distanceToHorizontalCenter
      ) {
        const strength = 1 - distanceToLeftEdge / CENTER_SNAP_THRESHOLD;
        const isSnapping = distanceToLeftEdge < 3;
        guides.push({
          id: "origin-left",
          type: "edge-left",
          position: 0,
          start: extendedBounds.top,
          end: extendedBounds.bottom,
          strength,
          isSnapping,
          distance: distanceToLeftEdge,
          label: showMeasurements ? `Origin X: ${distanceToLeftEdge.toFixed(1)}px` : undefined,
        });
      }

      // Top edge to origin (y = 0)
      if (
        distanceToTopEdge < CENTER_SNAP_THRESHOLD &&
        distanceToTopEdge < distanceToVerticalCenter
      ) {
        const strength = 1 - distanceToTopEdge / CENTER_SNAP_THRESHOLD;
        const isSnapping = distanceToTopEdge < 3;
        guides.push({
          id: "origin-top",
          type: "edge-top",
          position: 0,
          start: extendedBounds.left,
          end: extendedBounds.right,
          strength,
          isSnapping,
          distance: distanceToTopEdge,
          label: showMeasurements ? `Origin Y: ${distanceToTopEdge.toFixed(1)}px` : undefined,
        });
      }

      return guides;
    },
    [calculateNodeBounds, showMeasurements, enableCenterSnapping, getVisibleBounds],
  );

  const findAlignmentGuides = useCallback(
    (draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const guides: AlignmentGuide[] = [];

      // Get viewport-aware bounds for proper guide extension
      const visibleBounds = getVisibleBounds();

      // Also consider node positions for context
      const allNodes = [draggingNode, ...otherNodes];
      const allBounds = allNodes.map((node) => calculateNodeBounds(node)).filter(Boolean);

      let extendedBounds = visibleBounds;

      // If we have nodes, extend bounds to include them
      if (allBounds.length > 0) {
        const nodeBounds = {
          left: Math.min(...allBounds.map((b) => b!.left)),
          right: Math.max(...allBounds.map((b) => b!.right)),
          top: Math.min(...allBounds.map((b) => b!.top)),
          bottom: Math.max(...allBounds.map((b) => b!.bottom)),
        };

        extendedBounds = {
          left: Math.min(visibleBounds.left, nodeBounds.left - 200),
          right: Math.max(visibleBounds.right, nodeBounds.right + 200),
          top: Math.min(visibleBounds.top, nodeBounds.top - 200),
          bottom: Math.max(visibleBounds.bottom, nodeBounds.bottom + 200),
        };
      }

      otherNodes.forEach((otherNode) => {
        const otherBounds = calculateNodeBounds(otherNode);
        if (!otherBounds) return;

        // Enhanced horizontal alignments with precision control
        const precision = keyboardModifiers.shift ? DESKTOP_PRECISION_THRESHOLD : snapThreshold;

        const leftAlign = Math.abs(draggingBounds.left - otherBounds.left);
        const centerAlign = Math.abs(draggingBounds.centerX - otherBounds.centerX);
        const rightAlign = Math.abs(draggingBounds.right - otherBounds.right);

        // Left edge alignment
        if (leftAlign < precision) {
          const strength = 1 - leftAlign / precision;
          const isSnapping = leftAlign < 2;
          guides.push({
            id: `left-${otherNode.id}`,
            type: enableAdvancedAlignment ? "edge-left" : "vertical",
            position: otherBounds.left,
            start: extendedBounds.top,
            end: extendedBounds.bottom,
            strength,
            isSnapping,
            distance: leftAlign,
            label: undefined,
          });
        }

        // Center alignment
        if (centerAlign < precision) {
          const strength = 1 - centerAlign / precision;
          const isSnapping = centerAlign < 2;
          guides.push({
            id: `center-${otherNode.id}`,
            type: enableAdvancedAlignment ? "center-vertical" : "vertical",
            position: otherBounds.centerX,
            start: extendedBounds.top,
            end: extendedBounds.bottom,
            strength,
            isSnapping,
            distance: centerAlign,
            label: showMeasurements ? `Center X: ${centerAlign.toFixed(1)}px` : undefined,
          });
        }

        // Right edge alignment
        if (rightAlign < precision) {
          const strength = 1 - rightAlign / precision;
          const isSnapping = rightAlign < 2;
          guides.push({
            id: `right-${otherNode.id}`,
            type: enableAdvancedAlignment ? "edge-right" : "vertical",
            position: otherBounds.right,
            start: extendedBounds.top,
            end: extendedBounds.bottom,
            strength,
            isSnapping,
            distance: rightAlign,
            label: undefined,
          });
        }

        // Enhanced vertical alignments with precision control
        const topAlign = Math.abs(draggingBounds.top - otherBounds.top);
        const middleAlign = Math.abs(draggingBounds.centerY - otherBounds.centerY);
        const bottomAlign = Math.abs(draggingBounds.bottom - otherBounds.bottom);

        // Top edge alignment
        if (topAlign < precision) {
          const strength = 1 - topAlign / precision;
          const isSnapping = topAlign < 2;
          guides.push({
            id: `top-${otherNode.id}`,
            type: enableAdvancedAlignment ? "edge-top" : "horizontal",
            position: otherBounds.top,
            start: extendedBounds.left,
            end: extendedBounds.right,
            strength,
            isSnapping,
            distance: topAlign,
            label: showMeasurements ? `Top Y: ${topAlign.toFixed(1)}px` : undefined,
          });
        }

        // Middle alignment
        if (middleAlign < precision) {
          const strength = 1 - middleAlign / precision;
          const isSnapping = middleAlign < 2;
          guides.push({
            id: `middle-${otherNode.id}`,
            type: enableAdvancedAlignment ? "center-horizontal" : "horizontal",
            position: otherBounds.centerY,
            start: extendedBounds.left,
            end: extendedBounds.right,
            strength,
            isSnapping,
            distance: middleAlign,
            label: showMeasurements ? `Center Y: ${middleAlign.toFixed(1)}px` : undefined,
          });
        }

        // Bottom edge alignment
        if (bottomAlign < precision) {
          const strength = 1 - bottomAlign / precision;
          const isSnapping = bottomAlign < 2;
          guides.push({
            id: `bottom-${otherNode.id}`,
            type: enableAdvancedAlignment ? "edge-bottom" : "horizontal",
            position: otherBounds.bottom,
            start: extendedBounds.left,
            end: extendedBounds.right,
            strength,
            isSnapping,
            distance: bottomAlign,
            label: showMeasurements ? `Bottom Y: ${bottomAlign.toFixed(1)}px` : undefined,
          });
        }
      });

      return guides;
    },
    [
      calculateNodeBounds,
      keyboardModifiers,
      enableAdvancedAlignment,
      showMeasurements,
      snapThreshold,
      getVisibleBounds,
    ],
  );

  // Haptic feedback effect
  const triggerHapticFeedback = useCallback(() => {
    if (!enableHapticFeedback) return;

    const now = Date.now();
    if (now - lastSnapTime.current > 100) {
      // Prevent too frequent feedback
      lastSnapTime.current = now;

      // Try to trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
      }

      // Removed visual feedback animation since we're not using jarring effects
    }
  }, [enableHapticFeedback]);

  useEffect(() => {
    if (!isDragging || !draggingNodeId) {
      setGuides([]);
      setSmartGuides([]);
      return;
    }

    const draggingNode = nodes.find((node) => node.id === draggingNodeId);
    if (!draggingNode) return;

    const otherNodes = nodes.filter((node) => node.id !== draggingNodeId);

    // Calculate alignment guides
    const alignmentGuides = findAlignmentGuides(draggingNode, otherNodes);

    // Calculate center snapping guides
    const centerGuides = findCenterSnapping(draggingNode);

    // Calculate diagonal guides
    const diagonalGuides = findDiagonalGuides(draggingNode, otherNodes);

    // Combine all alignment guides with priority sorting and limit
    const allGuides = [...alignmentGuides, ...centerGuides, ...diagonalGuides]
      .sort((a, b) => {
        // Prioritize snapping guides
        if (a.isSnapping && !b.isSnapping) return -1;
        if (!a.isSnapping && b.isSnapping) return 1;
        // Then by strength
        return b.strength - a.strength;
      })
      .slice(0, MAX_GUIDES);

    const newGuides = allGuides;

    // Calculate smart guides (spacing and distance measurements)
    const newSmartGuides = [
      ...(enableSmartGuides ? findSpacingGuides(draggingNode, otherNodes) : []),
      ...(enableDistanceMeasurements ? findDistanceGuides(draggingNode, otherNodes) : []),
    ];

    // Check if we have snapping guides (strong alignment)
    const hasSnapping = newGuides.some((guide) => guide.isSnapping);
    if (hasSnapping) {
      triggerHapticFeedback();
    }

    setGuides(newGuides);
    setSmartGuides(newSmartGuides);
  }, [
    nodes,
    draggingNodeId,
    isDragging,
    findAlignmentGuides,
    findCenterSnapping,
    findSpacingGuides,
    findDiagonalGuides,
    findDistanceGuides,
    triggerHapticFeedback,
    enableSmartGuides,
    enableCenterSnapping,
    enableDiagonalGuides,
    enableDistanceMeasurements,
    viewport,
  ]);

  if (!isDragging || (guides.length === 0 && smartGuides.length === 0)) return null;

  const { x, y, zoom } = viewport;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {guides.map((guide) => {
          // Handle diagonal guides separately
          if (guide.type === "diagonal") {
            const strokeColor = DIAGONAL_GUIDE_COLOR;
            const strokeWidth = GUIDE_WIDTH;
            const opacity = guide.strength * 0.7;
            const strokeDasharray = "6,6";

            return (
              <g key={guide.id}>
                {/* Diagonal guide line */}
                <line
                  x1={guide.startX}
                  y1={guide.startY}
                  x2={guide.endX}
                  y2={guide.endY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  opacity={opacity}
                  style={{
                    filter: "drop-shadow(0 0 2px rgba(139, 92, 246, 0.4))",
                    transition: "all 0.15s ease-out",
                  }}
                />

                {/* Label for diagonal guides */}
                {guide.label && showMeasurements && (
                  <g>
                    <rect
                      x={(guide.startX! + guide.endX!) / 2 - 20}
                      y={(guide.startY! + guide.endY!) / 2 - 10}
                      width={40}
                      height={20}
                      fill="white"
                      stroke={strokeColor}
                      strokeWidth="1"
                      rx="3"
                      opacity="0.95"
                    />
                    <text
                      x={(guide.startX! + guide.endX!) / 2}
                      y={(guide.startY! + guide.endY!) / 2 + 4}
                      fill={strokeColor}
                      fontSize="10"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontWeight="600"
                      textAnchor="middle"
                      style={{
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      {guide.label}
                    </text>
                  </g>
                )}

                {/* Removed jarring snap indicators */}
              </g>
            );
          }

          // Regular horizontal/vertical guides
          const isVertical =
            guide.type.includes("vertical") ||
            guide.type.includes("edge-left") ||
            guide.type.includes("edge-right") ||
            guide.type.includes("center-vertical");

          // Use soft colors only - no jarring red
          const strokeColor = guide.type.includes("center") ? CENTER_SNAP_COLOR : GUIDE_COLOR;
          const strokeWidth = GUIDE_WIDTH;
          const opacity = guide.strength * 0.7;
          const strokeDasharray = "5,5";
          const filter = "drop-shadow(0 0 2px rgba(59, 130, 246, 0.4))";

          return (
            <g key={guide.id}>
              {/* Main guide line */}
              <line
                x1={isVertical ? guide.position : guide.start}
                y1={isVertical ? guide.start : guide.position}
                x2={isVertical ? guide.position : guide.end}
                y2={isVertical ? guide.end : guide.position}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                opacity={opacity}
                style={{
                  filter: filter,
                  transition: "all 0.15s ease-out",
                }}
              />

              {/* Center origin indicator removed */}

              {/* Origin edge indicator removed */}

              {/* Distance label */}
              {guide.label &&
                showMeasurements &&
                !guide.id.includes("center-") &&
                !guide.id.includes("origin-") && (
                  <text
                    x={isVertical ? guide.position + 8 : (guide.start + guide.end) / 2}
                    y={isVertical ? (guide.start + guide.end) / 2 : guide.position - 8}
                    fill={strokeColor}
                    fontSize="11"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity={opacity * 0.9}
                    style={{
                      userSelect: "none",
                      pointerEvents: "none",
                      textShadow: "0 1px 2px rgba(255,255,255,0.8)",
                    }}
                  >
                    {guide.label}
                  </text>
                )}

              {/* Removed snap indicator dots and animation pulse - keeping soft guides only */}
            </g>
          );
        })}

        {/* Smart Guides - Spacing */}
        {smartGuides.map((smartGuide) => (
          <g key={smartGuide.id}>
            {/* Smart guide line */}
            <line
              x1={smartGuide.position.start.x}
              y1={smartGuide.position.start.y}
              x2={smartGuide.position.end.x}
              y2={smartGuide.position.end.y}
              stroke={smartGuide.color}
              strokeWidth={1.5}
              strokeDasharray="3,3"
              opacity="0.7"
              style={{
                filter: `drop-shadow(0 0 2px ${smartGuide.color}40)`,
                transition: "all 0.15s ease-out",
              }}
            />

            {/* Measurement arrows */}
            <g>
              {/* Start arrow */}
              <polygon
                points={`${smartGuide.position.start.x},${smartGuide.position.start.y - 3} ${smartGuide.position.start.x + 4},${smartGuide.position.start.y} ${smartGuide.position.start.x},${smartGuide.position.start.y + 3}`}
                fill={smartGuide.color}
                opacity="0.8"
              />
              {/* End arrow */}
              <polygon
                points={`${smartGuide.position.end.x},${smartGuide.position.end.y - 3} ${smartGuide.position.end.x - 4},${smartGuide.position.end.y} ${smartGuide.position.end.x},${smartGuide.position.end.y + 3}`}
                fill={smartGuide.color}
                opacity="0.8"
              />
            </g>

            {/* Smart guide label */}
            {showMeasurements && (
              <g>
                {/* Label background */}
                <rect
                  x={
                    (smartGuide.position.start.x + smartGuide.position.end.x) / 2 -
                    smartGuide.label.length * 3
                  }
                  y={smartGuide.position.start.y - 15}
                  width={smartGuide.label.length * 6}
                  height="12"
                  fill="white"
                  stroke={smartGuide.color}
                  strokeWidth="0.5"
                  rx="2"
                  opacity="0.9"
                />
                {/* Label text */}
                <text
                  x={(smartGuide.position.start.x + smartGuide.position.end.x) / 2}
                  y={smartGuide.position.start.y - 7}
                  fill={smartGuide.color}
                  fontSize="10"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  textAnchor="middle"
                  fontWeight="500"
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {smartGuide.label}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* CSS Animation for pulse effect */}
        <style>
          {`
          @keyframes pulse {
            0% { opacity: 0.8; stroke-width: ${GUIDE_WIDTH + 4}; }
            100% { opacity: 0; stroke-width: ${GUIDE_WIDTH + 2}; }
          }
        `}
        </style>
      </g>
    </svg>
  );
};
