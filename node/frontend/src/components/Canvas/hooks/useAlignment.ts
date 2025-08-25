import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CanvasNode } from '@coordnet/core';

// Guide types
export interface BaseGuide {
  id: string;
  type: string;
  priority: number;
  isSnapping: boolean;
  strength: number;
  color: string;
}

export interface AlignmentGuide extends BaseGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  label?: string;
}

export interface DiagonalGuide extends BaseGuide {
  type: 'diagonal';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angle: number;
  label?: string;
}

export interface DistanceGuide extends BaseGuide {
  type: 'distance';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
  label: string;
}

export type Guide = AlignmentGuide | DiagonalGuide | DistanceGuide;

// Settings interface
interface AlignmentSettings {
  enabled: boolean;
  snapThreshold: number;
  showMeasurements: boolean;
  guides: {
    alignment: boolean;
    diagonal: boolean;
    distance: boolean;
    center: boolean;
  };
  snapAngles: number[];
}

const COLORS = {
  alignment: '#3b82f6',
  diagonal: '#8b5cf6', 
  distance: '#ec4899',
  center: '#10b981',
  snap: '#ef4444',
};

const DEFAULT_SETTINGS: AlignmentSettings = {
  enabled: true,
  snapThreshold: 8,
  showMeasurements: true,
  guides: {
    alignment: true,
    diagonal: true,
    distance: false, // Off by default, enable with Alt
    center: true,
  },
  snapAngles: [30, 45, 60, 90, 120, 135, 150],
};

export function useAlignment() {
  const { getNode, getViewport } = useReactFlow();
  const [settings, setSettings] = useState<AlignmentSettings>(DEFAULT_SETTINGS);

  // Calculate node bounds
  const calculateNodeBounds = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) return null;

    const width = node.width || 150;
    const height = node.height || 100;
    
    return {
      left: node.position.x,
      right: node.position.x + width,
      top: node.position.y,
      bottom: node.position.y + height,
      centerX: node.position.x + width / 2,
      centerY: node.position.y + height / 2,
      width,
      height,
    };
  }, [getNode]);

  // Get visible bounds for guide extension
  const getVisibleBounds = useCallback(() => {
    const viewport = getViewport();
    const padding = 200;
    
    return {
      left: -viewport.x / viewport.zoom - padding,
      right: (window.innerWidth - viewport.x) / viewport.zoom + padding,
      top: -viewport.y / viewport.zoom - padding,
      bottom: (window.innerHeight - viewport.y) / viewport.zoom + padding,
    };
  }, [getViewport]);

  // Calculate alignment guides
  const calculateGuides = useCallback((
    nodes: CanvasNode[],
    draggingNodeId: string,
    keyboardState?: { alt: boolean; shift: boolean }
  ): Guide[] => {
    if (!settings.enabled) return [];

    const draggingBounds = calculateNodeBounds(draggingNodeId);
    if (!draggingBounds) return [];

    const otherNodes = nodes.filter(node => node.id !== draggingNodeId);
    const visibleBounds = getVisibleBounds();
    const allGuides: Guide[] = [];
    const threshold = keyboardState?.shift ? 1 : settings.snapThreshold;

    // Alignment Guides
    if (settings.guides.alignment) {
      otherNodes.forEach(otherNode => {
        const otherBounds = calculateNodeBounds(otherNode.id);
        if (!otherBounds) return;

        // Vertical alignments
        const vAlignments = [
          { pos: otherBounds.left, type: 'left', distance: Math.abs(draggingBounds.left - otherBounds.left) },
          { pos: otherBounds.centerX, type: 'center', distance: Math.abs(draggingBounds.centerX - otherBounds.centerX) },
          { pos: otherBounds.right, type: 'right', distance: Math.abs(draggingBounds.right - otherBounds.right) },
        ];

        vAlignments.forEach(({ pos, type, distance }) => {
          if (distance < threshold) {
            const strength = 1 - (distance / threshold);
            const isSnapping = distance < 2;
            
            allGuides.push({
              id: `v-${type}-${otherNode.id}`,
              type: 'vertical',
              position: pos,
              start: visibleBounds.top,
              end: visibleBounds.bottom,
              priority: isSnapping ? 1 : 2,
              isSnapping,
              strength,
              color: isSnapping ? COLORS.snap : COLORS.alignment,
              label: settings.showMeasurements ? `${distance.toFixed(0)}px` : undefined,
            } as AlignmentGuide);
          }
        });

        // Horizontal alignments
        const hAlignments = [
          { pos: otherBounds.top, type: 'top', distance: Math.abs(draggingBounds.top - otherBounds.top) },
          { pos: otherBounds.centerY, type: 'middle', distance: Math.abs(draggingBounds.centerY - otherBounds.centerY) },
          { pos: otherBounds.bottom, type: 'bottom', distance: Math.abs(draggingBounds.bottom - otherBounds.bottom) },
        ];

        hAlignments.forEach(({ pos, type, distance }) => {
          if (distance < threshold) {
            const strength = 1 - (distance / threshold);
            const isSnapping = distance < 2;
            
            allGuides.push({
              id: `h-${type}-${otherNode.id}`,
              type: 'horizontal',
              position: pos,
              start: visibleBounds.left,
              end: visibleBounds.right,
              priority: isSnapping ? 1 : 2,
              isSnapping,
              strength,
              color: isSnapping ? COLORS.snap : COLORS.alignment,
              label: settings.showMeasurements ? `${distance.toFixed(0)}px` : undefined,
            } as AlignmentGuide);
          }
        });
      });
    }

    // Center Guides (snap to origin 0,0)
    if (settings.guides.center) {
      const centerThreshold = 15;
      const distanceToX = Math.abs(draggingBounds.centerX);
      const distanceToY = Math.abs(draggingBounds.centerY);

      if (distanceToX < centerThreshold) {
        const strength = 1 - (distanceToX / centerThreshold);
        const isSnapping = distanceToX < 3;
        
        allGuides.push({
          id: 'center-vertical',
          type: 'vertical',
          position: 0,
          start: visibleBounds.top,
          end: visibleBounds.bottom,
          priority: 1,
          isSnapping,
          strength,
          color: COLORS.center,
          label: 'Center (0,0)',
        } as AlignmentGuide);
      }

      if (distanceToY < centerThreshold) {
        const strength = 1 - (distanceToY / centerThreshold);
        const isSnapping = distanceToY < 3;
        
        allGuides.push({
          id: 'center-horizontal',
          type: 'horizontal',
          position: 0,
          start: visibleBounds.left,
          end: visibleBounds.right,
          priority: 1,
          isSnapping,
          strength,
          color: COLORS.center,
          label: 'Center (0,0)',
        } as AlignmentGuide);
      }
    }

    // Diagonal Guides
    if (settings.guides.diagonal) {
      otherNodes.forEach(otherNode => {
        const otherBounds = calculateNodeBounds(otherNode.id);
        if (!otherBounds) return;

        const deltaX = draggingBounds.centerX - otherBounds.centerX;
        const deltaY = draggingBounds.centerY - otherBounds.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < 50) return;

        const actualAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const normalizedAngle = ((actualAngle % 360) + 360) % 360;

        settings.snapAngles.forEach(targetAngle => {
          const angleDiff = Math.min(
            Math.abs(normalizedAngle - targetAngle),
            Math.abs(normalizedAngle - targetAngle + 360),
            Math.abs(normalizedAngle - targetAngle - 360)
          );

          if (angleDiff < 5) {
            const strength = 1 - (angleDiff / 5);
            const isSnapping = angleDiff < 2;
            
            const radians = targetAngle * (Math.PI / 180);
            const length = 300;
            
            allGuides.push({
              id: `diagonal-${otherNode.id}-${targetAngle}`,
              type: 'diagonal',
              startX: otherBounds.centerX - Math.cos(radians) * length / 2,
              startY: otherBounds.centerY - Math.sin(radians) * length / 2,
              endX: otherBounds.centerX + Math.cos(radians) * length / 2,
              endY: otherBounds.centerY + Math.sin(radians) * length / 2,
              angle: targetAngle,
              priority: isSnapping ? 1 : 3,
              isSnapping,
              strength,
              color: isSnapping ? COLORS.snap : COLORS.diagonal,
              label: settings.showMeasurements ? `${targetAngle}°` : undefined,
            } as DiagonalGuide);
          }
        });
      });
    }

    // Distance Guides (Alt key only)
    if (settings.guides.distance && keyboardState?.alt) {
      otherNodes.forEach(otherNode => {
        const otherBounds = calculateNodeBounds(otherNode.id);
        if (!otherBounds) return;

        const centerDistance = Math.sqrt(
          Math.pow(draggingBounds.centerX - otherBounds.centerX, 2) + 
          Math.pow(draggingBounds.centerY - otherBounds.centerY, 2)
        );

        if (centerDistance > 50 && centerDistance < 400) {
          allGuides.push({
            id: `distance-${otherNode.id}`,
            type: 'distance',
            startX: otherBounds.centerX,
            startY: otherBounds.centerY,
            endX: draggingBounds.centerX,
            endY: draggingBounds.centerY,
            distance: centerDistance,
            priority: 4,
            isSnapping: false,
            strength: 1,
            color: COLORS.distance,
            label: `${centerDistance.toFixed(0)}px`,
          } as DistanceGuide);
        }
      });
    }

    // Modify components/Canvas/hooks/useAlignment.ts
// Add this section after your existing alignment guides code (around line 200+):

// Node-to-Node Distance Measurements (always show when dragging)
if (settings.showMeasurements) {
  otherNodes.forEach(otherNode => {
    const otherBounds = calculateNodeBounds(otherNode.id);
    if (!otherBounds) return;

    // Calculate edge-to-edge distances
    const horizontalGap = Math.min(
      Math.abs(draggingBounds.left - otherBounds.right),  // Left edge to right edge
      Math.abs(draggingBounds.right - otherBounds.left)   // Right edge to left edge
    );
    
    const verticalGap = Math.min(
      Math.abs(draggingBounds.top - otherBounds.bottom),   // Top edge to bottom edge
      Math.abs(draggingBounds.bottom - otherBounds.top)    // Bottom edge to top edge
    );

    // Show horizontal distance (gap between nodes horizontally)
    if (horizontalGap > 0 && horizontalGap < 500) {
      const isLeftToRight = draggingBounds.left > otherBounds.right;
      const startX = isLeftToRight ? otherBounds.right : otherBounds.left;
      const endX = isLeftToRight ? draggingBounds.left : draggingBounds.right;
      const midY = (draggingBounds.centerY + otherBounds.centerY) / 2;

      allGuides.push({
        id: `h-distance-${otherNode.id}`,
        type: 'distance',
        startX: startX,
        startY: midY,
        endX: endX,
        endY: midY,
        distance: horizontalGap,
        priority: 6,
        isSnapping: false,
        strength: 1,
        color: '#10b981', // Green color for distances
        label: `${Math.round(horizontalGap)}px`,
      } as DistanceGuide);
    }

    // Show vertical distance (gap between nodes vertically)
    if (verticalGap > 0 && verticalGap < 500) {
      const isTopToBottom = draggingBounds.top > otherBounds.bottom;
      const startY = isTopToBottom ? otherBounds.bottom : otherBounds.top;
      const endY = isTopToBottom ? draggingBounds.top : draggingBounds.bottom;
      const midX = (draggingBounds.centerX + otherBounds.centerX) / 2;

      allGuides.push({
        id: `v-distance-${otherNode.id}`,
        type: 'distance',
        startX: midX,
        startY: startY,
        endX: midX,
        endY: endY,
        distance: verticalGap,
        priority: 6,
        isSnapping: false,
        strength: 1,
        color: '#10b981', // Green color for distances
        label: `${Math.round(verticalGap)}px`,
      } as DistanceGuide);
    }

    // Show center-to-center distance (diagonal)
    const centerDistance = Math.sqrt(
      Math.pow(draggingBounds.centerX - otherBounds.centerX, 2) + 
      Math.pow(draggingBounds.centerY - otherBounds.centerY, 2)
    );

    // Only show center distance if nodes are far apart (not overlapping)
    if (centerDistance > 100 && centerDistance < 600) {
      allGuides.push({
        id: `center-distance-${otherNode.id}`,
        type: 'distance',
        startX: otherBounds.centerX,
        startY: otherBounds.centerY,
        endX: draggingBounds.centerX,
        endY: draggingBounds.centerY,
        distance: centerDistance,
        priority: 7,
        isSnapping: false,
        strength: 0.7, // Slightly transparent
        color: '#6366f1', // Purple color for center distances
        label: `${Math.round(centerDistance)}px`,
      } as DistanceGuide);
    }
  });
}

    // Sort by priority and limit for performance
    return allGuides
      .sort((a, b) => a.priority - b.priority || b.strength - a.strength)
      .slice(0, 15);
  }, [settings, calculateNodeBounds, getVisibleBounds]);

  // Settings management
  const updateSettings = useCallback((newSettings: Partial<AlignmentSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleGuide = useCallback((guideType: keyof AlignmentSettings['guides']) => {
    setSettings(prev => ({
      ...prev,
      guides: {
        ...prev.guides,
        [guideType]: !prev.guides[guideType],
      },
    }));
  }, []);

  return {
    settings,
    updateSettings,
    toggleGuide,
    calculateGuides,
  };
}