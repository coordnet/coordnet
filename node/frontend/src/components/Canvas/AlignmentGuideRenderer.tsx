import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Guide, AlignmentGuide, DiagonalGuide, DistanceGuide } from './hooks/useAlignment';

interface AlignmentGuideRendererProps {
  guides: Guide[];
}

export function AlignmentGuideRenderer({ guides }: AlignmentGuideRendererProps) {
  const { getViewport } = useReactFlow();
  
  if (!guides.length) return null;

  const { x, y, zoom } = getViewport();

  const renderAlignmentGuide = (guide: AlignmentGuide) => {
    const isVertical = guide.type === 'vertical';
    const strokeDasharray = guide.isSnapping ? "8,4" : "5,5";
    const strokeWidth = guide.isSnapping ? 3 : 2;
    const opacity = guide.strength * (guide.isSnapping ? 1 : 0.7);

    return (
      <g key={guide.id}>
        <line
          x1={isVertical ? guide.position : guide.start}
          y1={isVertical ? guide.start : guide.position}
          x2={isVertical ? guide.position : guide.end}
          y2={isVertical ? guide.end : guide.position}
          stroke={guide.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
          style={{
            filter: guide.isSnapping ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' : undefined,
            transition: 'all 0.15s ease-out',
          }}
        />
        
        {guide.isSnapping && (
          <>
            <circle
              cx={isVertical ? guide.position : guide.start}
              cy={isVertical ? guide.start : guide.position}
              r="3"
              fill={guide.color}
              opacity="0.8"
            />
            <circle
              cx={isVertical ? guide.position : guide.end}
              cy={isVertical ? guide.end : guide.position}
              r="3"
              fill={guide.color}
              opacity="0.8"
            />
          </>
        )}
        
        {guide.label && (
          <text
            x={isVertical ? guide.position + 8 : (guide.start + guide.end) / 2}
            y={isVertical ? (guide.start + guide.end) / 2 : guide.position - 8}
            fill={guide.color}
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

        {/* Special styling for center guides */}
        {guide.id.includes('center') && guide.isSnapping && (
          <g>
            <circle
              cx={isVertical ? guide.position : 0}
              cy={isVertical ? 0 : guide.position}
              r="6"
              fill="none"
              stroke={guide.color}
              strokeWidth="2"
              opacity="0.8"
            />
            <circle
              cx={isVertical ? guide.position : 0}
              cy={isVertical ? 0 : guide.position}
              r="2"
              fill={guide.color}
              opacity="0.9"
            />
          </g>
        )}
      </g>
    );
  };

  const renderDiagonalGuide = (guide: DiagonalGuide) => {
    const strokeDasharray = guide.isSnapping ? "8,4" : "6,6";
    const strokeWidth = guide.isSnapping ? 3 : 2;
    const opacity = guide.strength * (guide.isSnapping ? 1 : 0.7);

    return (
      <g key={guide.id}>
        <line
          x1={guide.startX}
          y1={guide.startY}
          x2={guide.endX}
          y2={guide.endY}
          stroke={guide.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
          style={{
            filter: guide.isSnapping ? 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))' : undefined,
            transition: 'all 0.15s ease-out',
          }}
        />
        
        {guide.label && (
          <g>
            <rect
              x={(guide.startX + guide.endX) / 2 - 30}
              y={(guide.startY + guide.endY) / 2 - 10}
              width={60}
              height={20}
              fill="white"
              stroke={guide.color}
              strokeWidth="1"
              rx="3"
              opacity="0.95"
            />
            <text
              x={(guide.startX + guide.endX) / 2}
              y={(guide.startY + guide.endY) / 2 + 4}
              fill={guide.color}
              fontSize="10"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="600"
              textAnchor="middle"
              style={{
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {guide.label}
            </text>
          </g>
        )}
        
        {guide.isSnapping && (
          <>
            <circle cx={guide.startX} cy={guide.startY} r="3" fill={guide.color} opacity="0.8" />
            <circle cx={guide.endX} cy={guide.endY} r="3" fill={guide.color} opacity="0.8" />
          </>
        )}
      </g>
    );
  };

  const renderDistanceGuide = (guide: DistanceGuide) => {
    return (
      <g key={guide.id}>
        <defs>
          <marker
            id={`arrowhead-${guide.id}`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={guide.color} />
          </marker>
        </defs>
        
        <line
          x1={guide.startX}
          y1={guide.startY}
          x2={guide.endX}
          y2={guide.endY}
          stroke={guide.color}
          strokeWidth={1.5}
          strokeDasharray="2,2"
          opacity="0.8"
          markerEnd={`url(#arrowhead-${guide.id})`}
          markerStart={`url(#arrowhead-${guide.id})`}
        />
        
        <g>
          <rect
            x={(guide.startX + guide.endX) / 2 - 25}
            y={(guide.startY + guide.endY) / 2 - 8}
            width={50}
            height={16}
            fill="white"
            stroke={guide.color}
            strokeWidth="0.5"
            rx="2"
            opacity="0.95"
          />
          <text
            x={(guide.startX + guide.endX) / 2}
            y={(guide.startY + guide.endY) / 2 + 3}
            fill={guide.color}
            fontSize="10"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            style={{
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {guide.label}
          </text>
        </g>
      </g>
    );
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {guides.map((guide) => {
          switch (guide.type) {
            case 'horizontal':
            case 'vertical':
              return renderAlignmentGuide(guide as AlignmentGuide);
            case 'diagonal':
              return renderDiagonalGuide(guide as DiagonalGuide);
            case 'distance':
              return renderDistanceGuide(guide as DistanceGuide);
            default:
              return null;
          }
        })}
      </g>
    </svg>
  );
}