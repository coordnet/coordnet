import { CanvasNode } from "@coordnet/core";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

interface DistanceMeasurement {
  id: string;
  distance: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: "horizontal" | "vertical" | "diagonal";
}

interface PixelDistancesProps {
  nodes: CanvasNode[];
  isAltPressed: boolean;
  selectedNodeId?: string;
}

const DISTANCE_COLOR = "#ef4444";
const DISTANCE_FONT_SIZE = 12;
const DISTANCE_PADDING = 8;

export const PixelDistances = ({ nodes, isAltPressed, selectedNodeId }: PixelDistancesProps) => {
  const { getNode } = useReactFlow();
  const [measurements, setMeasurements] = useState<DistanceMeasurement[]>([]);

  const calculateNodeBounds = useCallback((node: CanvasNode) => {
    const reactFlowNode = getNode(node.id);
    if (!reactFlowNode) return null;

    const { position, width = 150, height = 100 } = reactFlowNode;
    return {
      left: position.x,
      right: position.x + width,
      top: position.y,
      bottom: position.y + height,
      centerX: position.x + width / 2,
      centerY: position.y + height / 2,
    };
  }, [getNode]);

  const calculateDistance = useCallback(
    (node1: CanvasNode, node2: CanvasNode): DistanceMeasurement | null => {
      const bounds1 = calculateNodeBounds(node1);
      const bounds2 = calculateNodeBounds(node2);
      if (!bounds1 || !bounds2) return null;

      // Calculate center-to-center distance
      const centerDistance = Math.sqrt(
        Math.pow(bounds2.centerX - bounds1.centerX, 2) + 
        Math.pow(bounds2.centerY - bounds1.centerY, 2)
      );

      // Calculate edge-to-edge distances
      const horizontalDistance = Math.abs(bounds2.centerX - bounds1.centerX);
      const verticalDistance = Math.abs(bounds2.centerY - bounds1.centerY);

      // Determine the closest edges for measurement
      const leftDistance = Math.abs(bounds2.left - bounds1.right);
      const rightDistance = Math.abs(bounds2.right - bounds1.left);
      const topDistance = Math.abs(bounds2.top - bounds1.bottom);
      const bottomDistance = Math.abs(bounds2.bottom - bounds1.top);

      // Find the shortest distance
      const distances = [
        { type: "horizontal" as const, distance: Math.min(leftDistance, rightDistance), 
          startX: bounds1.centerX, startY: bounds1.centerY, 
          endX: bounds2.centerX, endY: bounds2.centerY },
        { type: "vertical" as const, distance: Math.min(topDistance, bottomDistance), 
          startX: bounds1.centerX, startY: bounds1.centerY, 
          endX: bounds2.centerX, endY: bounds2.centerY },
        { type: "diagonal" as const, distance: centerDistance, 
          startX: bounds1.centerX, startY: bounds1.centerY, 
          endX: bounds2.centerX, endY: bounds2.centerY },
      ];

      const shortest = distances.reduce((min, current) => 
        current.distance < min.distance ? current : min
      );

      return {
        id: `${node1.id}-${node2.id}`,
        distance: Math.round(shortest.distance),
        startX: shortest.startX,
        startY: shortest.startY,
        endX: shortest.endX,
        endY: shortest.endY,
        type: shortest.type,
      };
    },
    [calculateNodeBounds]
  );

  useEffect(() => {
    if (!isAltPressed || !selectedNodeId) {
      setMeasurements([]);
      return;
    }

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode) return;

    const otherNodes = nodes.filter((node) => node.id !== selectedNodeId);
    const newMeasurements: DistanceMeasurement[] = [];

    otherNodes.forEach((otherNode) => {
      const measurement = calculateDistance(selectedNode, otherNode);
      if (measurement) {
        newMeasurements.push(measurement);
      }
    });

    setMeasurements(newMeasurements);
  }, [nodes, isAltPressed, selectedNodeId, calculateDistance]);

  if (!isAltPressed || measurements.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    >
      {measurements.map((measurement) => (
        <g key={measurement.id}>
          {/* Distance line */}
          <line
            x1={measurement.startX}
            y1={measurement.startY}
            x2={measurement.endX}
            y2={measurement.endY}
            stroke={DISTANCE_COLOR}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          
          {/* Distance label background */}
          <rect
            x={(measurement.startX + measurement.endX) / 2 - 30}
            y={(measurement.startY + measurement.endY) / 2 - 10}
            width={60}
            height={20}
            fill="white"
            stroke={DISTANCE_COLOR}
            strokeWidth={1}
            rx={4}
          />
          
          {/* Distance text */}
          <text
            x={(measurement.startX + measurement.endX) / 2}
            y={(measurement.startY + measurement.endY) / 2 + 4}
            textAnchor="middle"
            fontSize={DISTANCE_FONT_SIZE}
            fill={DISTANCE_COLOR}
            fontWeight="bold"
          >
            {measurement.distance}px
          </text>
        </g>
      ))}
    </svg>
  );
}; 