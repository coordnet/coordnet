import { CanvasNode } from "@coordnet/core";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState, useRef } from "react";

interface AlignmentGuide {
  id: string;
  type: "horizontal" | "vertical" | "center-horizontal" | "center-vertical" | "edge-top" | "edge-bottom" | "edge-left" | "edge-right";
  position: number;
  start: number;
  end: number;
  strength: number; // 0-1 for animation intensity
  isSnapping: boolean;
  distance?: number;
  label?: string;
}

interface SmartGuide {
  id: string;
  type: "spacing" | "distribution" | "alignment" | "margin";
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
  enableDistributionGuides?: boolean;
  enableSpacingGuides?: boolean;
  showMeasurements?: boolean;
  enableAdvancedAlignment?: boolean;
  enableCenterSnapping?: boolean;
}

const DEFAULT_SNAP_THRESHOLD = 8; // pixels - more sensitive
const GUIDE_COLOR = "#3b82f6";
const GUIDE_WIDTH = 2;
const SNAP_COLOR = "#ef4444"; // Red when snapping
const CENTER_SNAP_COLOR = "#10b981"; // Green for center snapping
const SMART_GUIDE_COLOR = "#10b981"; // Green for smart guides
const SPACING_GUIDE_COLOR = "#f59e0b"; // Amber for spacing
// const MARGIN_GUIDE_COLOR = "#8b5cf6"; // Purple for margins - Reserved for future use
const ANIMATION_DURATION = 150; // ms
const DESKTOP_PRECISION_THRESHOLD = 1; // Higher precision for desktop
const CENTER_SNAP_THRESHOLD = 15; // Larger threshold for center snapping

export const AlignmentGuides = ({ 
  nodes, 
  draggingNodeId, 
  isDragging, 
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
  enableHapticFeedback = true,
  enableSmartGuides = true,
  enableDistributionGuides = true,
  enableSpacingGuides = true,
  showMeasurements = true,
  enableAdvancedAlignment = true,
  enableCenterSnapping = true
}: AlignmentGuidesProps) => {
  const { getNode, getViewport } = useReactFlow();
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const [snapAnimation, setSnapAnimation] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const lastSnapTime = useRef<number>(0);
  // const [hoveredGuide, setHoveredGuide] = useState<string | null>(null); // Reserved for future hover interactions
  const [keyboardModifiers, setKeyboardModifiers] = useState({
    shift: false,
    ctrl: false,
    alt: false
  });

  const calculateNodeBounds = useCallback((node: CanvasNode) => {
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
  }, [getNode]);

  // Enhanced keyboard event handling for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeyboardModifiers(prev => ({
        ...prev,
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeyboardModifiers(prev => ({
        ...prev,
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey
      }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
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
    const canvasElement = document.querySelector('.react-flow__viewport');
    if (canvasElement) {
      // Listen for transform changes
      const observer = new MutationObserver(() => {
        updateViewportState();
      });
      
      observer.observe(canvasElement, {
        attributes: true,
        attributeFilter: ['style', 'transform']
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
      y: -vp.y / vp.zoom
    };
    
    const bottomRight = {
      x: (viewportWidth - vp.x) / vp.zoom,
      y: (viewportHeight - vp.y) / vp.zoom
    };
    
    return {
      left: topLeft.x - 200, // Add padding
      right: bottomRight.x + 200,
      top: topLeft.y - 200,
      bottom: bottomRight.y + 200,
    };
  }, [getViewport]);

  // Enhanced spacing detection for smart guides
  const findSpacingGuides = useCallback((draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
    if (!enableSpacingGuides) return [];
    
    const draggingBounds = calculateNodeBounds(draggingNode);
    if (!draggingBounds) return [];

    const spacingGuides: SmartGuide[] = [];
    
    // Find consistent spacing patterns
    const sortedNodes = otherNodes
      .map(node => ({ node, bounds: calculateNodeBounds(node) }))
      .filter(item => item.bounds)
      .sort((a, b) => a.bounds!.left - b.bounds!.left);

    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const current = sortedNodes[i].bounds!;
      const next = sortedNodes[i + 1].bounds!;
      const spacing = next.left - current.right;

      // Check if dragging node would create consistent spacing
      const dragToCurrentSpacing = Math.abs((draggingBounds.left - current.right) - spacing);
      const dragFromNextSpacing = Math.abs((next.left - draggingBounds.right) - spacing);

      if (dragToCurrentSpacing < snapThreshold) {
        spacingGuides.push({
          id: `spacing-${i}`,
          type: "spacing",
          nodes: [sortedNodes[i].node.id, draggingNode.id],
          measurement: spacing,
          position: {
            start: { x: current.right, y: current.centerY },
            end: { x: current.right + spacing, y: current.centerY }
          },
          label: `${spacing.toFixed(0)}px`,
          color: SPACING_GUIDE_COLOR
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
            end: { x: draggingBounds.right + spacing, y: draggingBounds.centerY }
          },
          label: `${spacing.toFixed(0)}px`,
          color: SPACING_GUIDE_COLOR
        });
      }
    }

    return spacingGuides;
  }, [calculateNodeBounds, enableSpacingGuides, snapThreshold]);

  // Enhanced distribution detection
  const findDistributionGuides = useCallback((draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
    if (!enableDistributionGuides) return [];
    
    const draggingBounds = calculateNodeBounds(draggingNode);
    if (!draggingBounds) return [];

    const distributionGuides: SmartGuide[] = [];
    
    // Find nodes that could form a distribution pattern
    const candidateNodes = otherNodes
      .map(node => ({ node, bounds: calculateNodeBounds(node) }))
      .filter(item => item.bounds);

    // Horizontal distribution
    const horizontallySorted = [...candidateNodes]
      .sort((a, b) => a.bounds!.centerX - b.bounds!.centerX);

    if (horizontallySorted.length >= 2) {
      for (let i = 0; i < horizontallySorted.length - 1; i++) {
        const current = horizontallySorted[i].bounds!;
        const next = horizontallySorted[i + 1].bounds!;
        const spacing = next.centerX - current.centerX;

        // Check if dragging node would maintain distribution
        const idealPosition = current.centerX + spacing;
        const distance = Math.abs(draggingBounds.centerX - idealPosition);

        if (distance < snapThreshold) {
          distributionGuides.push({
            id: `distribution-h-${i}`,
            type: "distribution",
            nodes: [horizontallySorted[i].node.id, draggingNode.id, horizontallySorted[i + 1].node.id],
            measurement: spacing,
            position: {
              start: { x: current.centerX, y: Math.min(current.top, next.top) - 20 },
              end: { x: next.centerX, y: Math.min(current.top, next.top) - 20 }
            },
            label: `${spacing.toFixed(0)}px distribution`,
            color: SMART_GUIDE_COLOR
          });
        }
      }
    }

    return distributionGuides;
  }, [calculateNodeBounds, enableDistributionGuides, snapThreshold]);

  // Center snapping detection (snap to canvas origin 0,0)
  const findCenterSnapping = useCallback((draggingNode: CanvasNode) => {
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
      const strength = 1 - (distanceToHorizontalCenter / CENTER_SNAP_THRESHOLD);
      const isSnapping = distanceToHorizontalCenter < 3;
      guides.push({
        id: 'center-vertical',
        type: 'center-vertical',
        position: 0,
        start: extendedBounds.top,
        end: extendedBounds.bottom,
        strength,
        isSnapping,
        distance: distanceToHorizontalCenter,
        label: showMeasurements ? `Center X: ${distanceToHorizontalCenter.toFixed(1)}px` : undefined,
      });
    }

    // Horizontal center line (y = 0)
    if (distanceToVerticalCenter < CENTER_SNAP_THRESHOLD) {
      const strength = 1 - (distanceToVerticalCenter / CENTER_SNAP_THRESHOLD);
      const isSnapping = distanceToVerticalCenter < 3;
      guides.push({
        id: 'center-horizontal',
        type: 'center-horizontal',
        position: 0,
        start: extendedBounds.left,
        end: extendedBounds.right,
        strength,
        isSnapping,
        distance: distanceToVerticalCenter,
        label: showMeasurements ? `Center Y: ${distanceToVerticalCenter.toFixed(1)}px` : undefined,
      });
    }

    // Left edge to origin (x = 0)
    if (distanceToLeftEdge < CENTER_SNAP_THRESHOLD && distanceToLeftEdge < distanceToHorizontalCenter) {
      const strength = 1 - (distanceToLeftEdge / CENTER_SNAP_THRESHOLD);
      const isSnapping = distanceToLeftEdge < 3;
      guides.push({
        id: 'origin-left',
        type: 'edge-left',
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
    if (distanceToTopEdge < CENTER_SNAP_THRESHOLD && distanceToTopEdge < distanceToVerticalCenter) {
      const strength = 1 - (distanceToTopEdge / CENTER_SNAP_THRESHOLD);
      const isSnapping = distanceToTopEdge < 3;
      guides.push({
        id: 'origin-top',
        type: 'edge-top',
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
  }, [calculateNodeBounds, showMeasurements, enableCenterSnapping, getVisibleBounds]);

  const findAlignmentGuides = useCallback(
    (draggingNode: CanvasNode, otherNodes: CanvasNode[]) => {
      const draggingBounds = calculateNodeBounds(draggingNode);
      if (!draggingBounds) return [];

      const guides: AlignmentGuide[] = [];
      
      // Get viewport-aware bounds for proper guide extension
      const visibleBounds = getVisibleBounds();
      
      // Also consider node positions for context
      const allNodes = [draggingNode, ...otherNodes];
      const allBounds = allNodes.map(node => calculateNodeBounds(node)).filter(Boolean);
      
      let extendedBounds = visibleBounds;
      
      // If we have nodes, extend bounds to include them
      if (allBounds.length > 0) {
        const nodeBounds = {
          left: Math.min(...allBounds.map(b => b!.left)),
          right: Math.max(...allBounds.map(b => b!.right)),
          top: Math.min(...allBounds.map(b => b!.top)),
          bottom: Math.max(...allBounds.map(b => b!.bottom)),
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
          const strength = 1 - (leftAlign / precision);
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
            label: showMeasurements ? `Left X: ${leftAlign.toFixed(1)}px` : undefined,
          });
        }

        // Center alignment
        if (centerAlign < precision) {
          const strength = 1 - (centerAlign / precision);
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
          const strength = 1 - (rightAlign / precision);
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
            label: showMeasurements ? `Right X: ${rightAlign.toFixed(1)}px` : undefined,
          });
        }

        // Enhanced vertical alignments with precision control
        const topAlign = Math.abs(draggingBounds.top - otherBounds.top);
        const middleAlign = Math.abs(draggingBounds.centerY - otherBounds.centerY);
        const bottomAlign = Math.abs(draggingBounds.bottom - otherBounds.bottom);

        // Top edge alignment
        if (topAlign < precision) {
          const strength = 1 - (topAlign / precision);
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
          const strength = 1 - (middleAlign / precision);
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
          const strength = 1 - (bottomAlign / precision);
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
    [calculateNodeBounds, keyboardModifiers, enableAdvancedAlignment, showMeasurements, snapThreshold, getVisibleBounds]
  );

  // Haptic feedback effect
  const triggerHapticFeedback = useCallback(() => {
    if (!enableHapticFeedback) return;
    
    const now = Date.now();
    if (now - lastSnapTime.current > 100) { // Prevent too frequent feedback
      lastSnapTime.current = now;
      
      // Try to trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
      }
      
      // Visual feedback animation
      setSnapAnimation(true);
      setTimeout(() => setSnapAnimation(false), ANIMATION_DURATION);
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
    
    // Combine all alignment guides
    const newGuides = [...alignmentGuides, ...centerGuides];
    
    // Calculate smart guides (spacing, distribution)
    const newSmartGuides = [
      ...(enableSmartGuides ? findSpacingGuides(draggingNode, otherNodes) : []),
      ...(enableSmartGuides ? findDistributionGuides(draggingNode, otherNodes) : [])
    ];
    
    // Check if we have snapping guides (strong alignment)
    const hasSnapping = newGuides.some(guide => guide.isSnapping);
    if (hasSnapping) {
      triggerHapticFeedback();
    }
    
    setGuides(newGuides);
    setSmartGuides(newSmartGuides);
  }, [nodes, draggingNodeId, isDragging, findAlignmentGuides, findCenterSnapping, findSpacingGuides, findDistributionGuides, triggerHapticFeedback, enableSmartGuides, enableCenterSnapping, viewport]);

  if (!isDragging || (guides.length === 0 && smartGuides.length === 0)) return null;

  const { x, y, zoom } = viewport;
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
      {guides.map((guide) => {
        const isVertical = guide.type.includes("vertical") || guide.type.includes("edge-left") || guide.type.includes("edge-right") || guide.type.includes("center-vertical");
        const strokeColor = guide.isSnapping ? SNAP_COLOR : GUIDE_COLOR;
        const strokeWidth = guide.isSnapping ? GUIDE_WIDTH + 1 : GUIDE_WIDTH;
        const opacity = guide.strength * (guide.isSnapping ? 1 : 0.7);
        
        // Unified styling for all guide types - same colors for vertical and horizontal
        const getGuideStyle = () => {
          // Use consistent colors regardless of guide type or orientation
          if (guide.isSnapping) {
            // All snapping guides use red color
            return { 
              strokeDasharray: "8,4", 
              filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))',
              strokeColor: SNAP_COLOR,
              strokeWidth: GUIDE_WIDTH + 1
            };
          } else {
            // All non-snapping guides use blue color
            return { 
              strokeDasharray: "5,5", 
              filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.4))',
              strokeColor: GUIDE_COLOR,
              strokeWidth: GUIDE_WIDTH
            };
          }
        };
        
        const guideStyle = getGuideStyle();
        const finalStrokeColor = guideStyle.strokeColor || strokeColor;
        const finalStrokeWidth = guideStyle.strokeWidth || strokeWidth;
        
        return (
          <g key={guide.id}>
            {/* Main guide line */}
            <line
              x1={isVertical ? guide.position : guide.start}
              y1={isVertical ? guide.start : guide.position}
              x2={isVertical ? guide.position : guide.end}
              y2={isVertical ? guide.end : guide.position}
              stroke={finalStrokeColor}
              strokeWidth={finalStrokeWidth}
              strokeDasharray={guideStyle.strokeDasharray}
              opacity={opacity}
              style={{
                filter: guide.isSnapping ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' : guideStyle.filter,
                transition: 'all 0.15s ease-out',
              }}
            />
            
            {/* Center origin indicator for center snap guides */}
            {guide.id.includes('center-') && guide.isSnapping && (
              <g>
                {/* Center cross indicator */}
                <circle
                  cx={guide.position}
                  cy={isVertical ? 0 : guide.position}
                  r="6"
                  fill="none"
                  stroke={CENTER_SNAP_COLOR}
                  strokeWidth="2"
                  opacity="0.8"
                />
                <circle
                  cx={guide.position}
                  cy={isVertical ? 0 : guide.position}
                  r="2"
                  fill={CENTER_SNAP_COLOR}
                  opacity="0.9"
                />
                {/* Center label */}
                <text
                  x={guide.position + 10}
                  y={isVertical ? -10 : guide.position - 10}
                  fill={CENTER_SNAP_COLOR}
                  fontSize="12"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="600"
                  opacity="0.9"
                  style={{
                    userSelect: 'none',
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  CENTER (0,0)
                </text>
              </g>
            )}
            
            {/* Origin edge indicator */}
            {guide.id.includes('origin-') && guide.isSnapping && (
              <g>
                <circle
                  cx={isVertical ? guide.position : 0}
                  cy={isVertical ? 0 : guide.position}
                  r="4"
                  fill="none"
                  stroke={CENTER_SNAP_COLOR}
                  strokeWidth="1.5"
                  opacity="0.8"
                />
                <text
                  x={isVertical ? guide.position + 8 : 8}
                  y={isVertical ? -8 : guide.position - 8}
                  fill={CENTER_SNAP_COLOR}
                  fontSize="10"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="500"
                  opacity="0.8"
                  style={{
                    userSelect: 'none',
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  ORIGIN
                </text>
              </g>
            )}
            
            {/* Distance label */}
            {guide.label && showMeasurements && !guide.id.includes('center-') && !guide.id.includes('origin-') && (
              <text
                x={isVertical ? guide.position + 8 : (guide.start + guide.end) / 2}
                y={isVertical ? (guide.start + guide.end) / 2 : guide.position - 8}
                fill={finalStrokeColor}
                fontSize="11"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity={opacity * 0.9}
                style={{
                  userSelect: 'none',
                  pointerEvents: 'none',
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                }}
              >
                {guide.label}
              </text>
            )}
            
            {/* Snap indicator dots */}
            {guide.isSnapping && (
              <>
                <circle
                  cx={isVertical ? guide.position : guide.start}
                  cy={isVertical ? guide.start : guide.position}
                  r="3"
                  fill={SNAP_COLOR}
                  opacity="0.8"
                />
                <circle
                  cx={isVertical ? guide.position : guide.end}
                  cy={isVertical ? guide.end : guide.position}
                  r="3"
                  fill={SNAP_COLOR}
                  opacity="0.8"
                />
              </>
            )}
            
            {/* Animation pulse effect when snapping */}
            {guide.isSnapping && snapAnimation && (
              <line
                x1={isVertical ? guide.position : guide.start}
                y1={isVertical ? guide.start : guide.position}
                x2={isVertical ? guide.position : guide.end}
                y2={isVertical ? guide.end : guide.position}
                stroke={SNAP_COLOR}
                strokeWidth={strokeWidth + 2}
                strokeDasharray="none"
                opacity="0.4"
                style={{
                  animation: 'pulse 0.15s ease-out',
                }}
              />
            )}
          </g>
        );
      })}
      
      {/* Smart Guides - Spacing and Distribution */}
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
              transition: 'all 0.15s ease-out',
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
                x={(smartGuide.position.start.x + smartGuide.position.end.x) / 2 - smartGuide.label.length * 3}
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
                  userSelect: 'none',
                  pointerEvents: 'none',
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