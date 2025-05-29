// components/CustomEdge.tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
}: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id= {id}  className="react-flow__edge-path" path={edgePath} markerEnd={markerEnd} style={{...style }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            background: "white",
            padding: 2,
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {data?.label || 'custom edge'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
