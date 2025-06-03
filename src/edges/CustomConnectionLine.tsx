import { getBezierPath } from "@xyflow/react";

// Rendering the temp line when dragging to create new edge
export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition = "right",
  toPosition = "left",
}: any) {
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
    sourcePosition: fromPosition,
    targetPosition: toPosition,
  });

  return (
    <path
      d={edgePath}
      stroke="#b1b1b7"
      strokeWidth={2}
      fill="none"
      markerEnd="url(#arrowhead)"
    />
  );
}
