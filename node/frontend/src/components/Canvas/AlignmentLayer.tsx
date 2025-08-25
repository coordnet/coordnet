import React from 'react';
import { CanvasNode } from '@coordnet/core';
import { useAlignment } from './hooks/useAlignment';
import { useKeyboardState } from './hooks/useKeyboardState';
import { AlignmentGuideRenderer } from './AlignmentGuideRenderer';

interface AlignmentLayerProps {
  nodes: CanvasNode[];
  draggingNodeId?: string;
  isDragging: boolean;
}

export function AlignmentLayer({ nodes, draggingNodeId, isDragging }: AlignmentLayerProps) {
  const { calculateGuides } = useAlignment();
  const keyboardState = useKeyboardState();

  // Calculate guides only when dragging
  const guides = React.useMemo(() => {
    if (!isDragging || !draggingNodeId) {
      return [];
    }

    return calculateGuides(nodes, draggingNodeId, keyboardState);
  }, [isDragging, draggingNodeId, nodes, keyboardState, calculateGuides]);

  if (!isDragging || !guides.length) return null;

  return <AlignmentGuideRenderer guides={guides} />;
}