import { CanvasNode } from "@coordnet/core";
import {
  ConnectionLineComponentProps,
  getSimpleBezierPath,
  useNodes,
  useReactFlow,
} from "@xyflow/react";

const ConnectionLine = ({ fromHandle, fromX, fromY, toX, toY }: ConnectionLineComponentProps) => {
  const { getInternalNode } = useReactFlow();
  const nodes = useNodes<CanvasNode>();
  const selectedNodes = nodes.filter((node) => node.selected);

  const handleBounds = selectedNodes.flatMap((userNode) => {
    const node = getInternalNode(userNode.id);

    // Only connect from sources
    if (!node?.internals?.handleBounds?.source) return [];

    return node.internals.handleBounds.source?.flatMap((bounds) => {
      // Don't connect to the wrong position
      if (fromHandle.position != bounds.position) return [];

      return { id: node.id, positionAbsolute: node.internals.positionAbsolute, bounds };
    });
  });

  if (!handleBounds.length) {
    const [d] = getSimpleBezierPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });
    return (
      <g key={fromHandle.id + "-line"}>
        <path fill="none" strokeWidth={1} stroke="#b1b1b7" d={d} />
        <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="black" strokeWidth={1.5} />
      </g>
    );
  }

  return handleBounds.map(({ id, positionAbsolute, bounds }) => {
    const fromHandleX = bounds.x + bounds.width / 2;
    const fromHandleY = bounds.y + bounds.height / 2;
    const fromX = positionAbsolute.x + fromHandleX;
    const fromY = positionAbsolute.y + fromHandleY;
    const [d] = getSimpleBezierPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });

    return (
      <g key={`${id}-${bounds.id}`}>
        <path fill="none" strokeWidth={1} stroke="#b1b1b7" d={d} />
        <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="black" strokeWidth={1.5} />
      </g>
    );
  });
};

export default ConnectionLine;
