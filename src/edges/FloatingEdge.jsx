import { useInternalNode, useReactFlow } from "@xyflow/react";
import { getEdgeParams } from "./initalElements.js";
import { useState, useRef, useEffect } from "react";

function getQuadraticPath(sx, sy, tx, ty, cx, cy) {
  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
}

// Helper to get point and normal on a quadratic bezier at t
function getQuadraticPointAndNormal(sx, sy, cx, cy, tx, ty, t) {
  const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
  const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;

  const dx = 2 * (1 - t) * (cx - sx) + 2 * t * (tx - cx);
  const dy = 2 * (1 - t) * (cy - sy) + 2 * t * (ty - cy);

  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;

  return { x, y, nx, ny };
}

function FloatingEdge({ id, source, target, markerEnd, style, data }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { setEdges } = useReactFlow();
  const pathRef = useRef(null);
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  // Fallback midpoint perpendicular offset control
  const t = 0.5;
  const offset = data?.offset ?? 40;

  // Default control point derived from offset
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / len;
  const perpY = dx / len;

  const cx = mx + perpX * offset;
  const cy = my + perpY * offset;

  const edgePath = getQuadraticPath(sx, sy, tx, ty, cx, cy);

  // Label position from actual path midpoint
  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      const midpoint = pathRef.current.getPointAtLength(length / 2);
      setLabelPos({ x: midpoint.x, y: midpoint.y });
    }
  }, [edgePath]);

  const influence = data?.influence ?? "";
  const control = data?.control ?? "";

  const updateEdgeData = (field, value) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: {
                ...edge.data,
                [field]: value,
              },
            }
          : edge
      )
    );
  };

  const handleEdgeClick = () => setEditing(true);
  const handleBlur = () => setEditing(false);

  // Compute handle position and normal
  const { x: hx, y: hy, nx, ny } = getQuadraticPointAndNormal(sx, sy, cx, cy, tx, ty, t);
  const handleX = hx + nx * 10; // slightly out from the curve
  const handleY = hy + ny * 10;

  return (
    <>
      <path
        ref={pathRef}
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={style}
        strokeWidth={2}
        stroke="#b1b1b7"
        fill="none"
        cursor="pointer"
        onClick={handleEdgeClick}
      />

      {(editing || influence || control) && (
        <>
          <foreignObject
            width={100}
            height={40}
            x={labelPos.x - 50}
            y={labelPos.y - 20}
            requiredExtensions="http://www.w3.org/1999/xhtml"
          >
            <div
              style={{
                fontSize: 10,
                background: "white",
                padding: "2px 4px",
                display: "inline-flex",
                gap: "4px",
                borderRadius: 3,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {editing ? (
                <>
                  <label>
                    I:
                    <input
                      value={influence}
                      onChange={(e) => {
                        if (/^-?\d*\.?\d*$/.test(e.target.value)) {
                          updateEdgeData("influence", e.target.value);
                        }
                      }}
                      onBlur={handleBlur}
                      className="nodrag"
                      style={{
                        width: 30,
                        fontSize: 10,
                        padding: "1px 4px",
                        borderRadius: 3,
                        border: "1px solid #aaa",
                      }}
                    />
                  </label>
                  <label>
                    C:
                    <input
                      value={control}
                      onChange={(e) => {
                        if (/^-?\d*\.?\d*$/.test(e.target.value)) {
                          updateEdgeData("control", e.target.value);
                        }
                      }}
                      onBlur={handleBlur}
                      className="nodrag"
                      style={{
                        width: 30,
                        fontSize: 10,
                        padding: "1px 4px",
                        borderRadius: 3,
                        border: "1px solid #aaa",
                      }}
                    />
                  </label>
                </>
              ) : (
                <div style={{ display: "flex", gap: 4 }}>
                  <div onClick={handleEdgeClick}>I: {influence}</div>
                  <div onClick={handleEdgeClick}>C: {control}</div>
                </div>
              )}
            </div>
          </foreignObject>

          {/* Draggable handle that adjusts offset */}
          <circle
            cx={handleX}
            cy={handleY}
            r={7}
            fill="#fff"
            stroke="#333"
            strokeWidth={1.5}
            style={{ cursor: "grab", pointerEvents: "all" }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startOffset = offset;

              const onMove = (moveEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                const dot = deltaX * perpX + deltaY * perpY;
                updateEdgeData("offset", startOffset + dot);
              };

              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          />
        </>
      )}
    </>
  );
}

export default FloatingEdge;
