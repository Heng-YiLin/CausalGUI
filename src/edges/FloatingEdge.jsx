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

  const len = Math.sqrt(dx * dx + dy * dy) || 1;

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
  const sign = data?.sign ?? null;
  const strokeColor =
    sign === "+"
      ? "#16a34a" // green
      : sign === "-"
      ? "#dc2626" // red
      : "#b1b1b7"; // neutral

  if (!sourceNode || !targetNode || !data || typeof data !== "object") {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  if (
    [sx, sy, tx, ty].some((v) => typeof v !== "number" || isNaN(v)) ||
    !sourceNode.position ||
    !targetNode.position
  ) {
    return null;
  }

  // Fallback midpoint perpendicular offset control
  const t = 0.5;
  const offset = data?.offset ?? 40;

  // Default control point derived from offset
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1; // fallback to 1
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

  const impact = data?.impact ?? 0;
  const control = data?.control ?? 0;

  const updateEdgeData = (field, value) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, [field]: value } }
          : edge
      )
    );
  };

  const cycleSign = () => {
    const next =
      sign === null ? "+" : sign === "+" ? "-" : null;
    updateEdgeData("sign", next);
  };
  const handleEdgeClick = () => setEditing(true);
  const handleBlur = () => setEditing(false);

  // Compute handle position and normal
  const {
    x: hx,
    y: hy,
    nx,
    ny,
  } = getQuadraticPointAndNormal(sx, sy, cx, cy, tx, ty, t);

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
        stroke={strokeColor} // <— here
        fill="none"
        cursor="pointer"
        onClick={handleEdgeClick}
      />

      {(editing || sign || impact || control) && (
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
              borderRadius: 3,
              alignItems: "center",
              justifyContent: "center",
              cursor: editing ? "text" : "grab",
              minWidth: 30,
              minHeight: 20,
            }}
            onPointerDown={(e) => {
              if (!editing) {
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
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {editing ? (
              <>
                <label>
                  I:
                  <input
                    value={impact}
                    onChange={(e) => {
                      if (/^-?\d*\.?\d*$/.test(e.target.value)) {
                        updateEdgeData("impact", e.target.value);
                      }
                    }}
                    onBlur={handleBlur}
                    className="nodrag"
                    style={{
                      width: 20,
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      border: "1px solid #aaa",
                      marginLeft:"2px",

                    }}
                  />
                </label>
                <label style={{marginLeft:"2px"}}>
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
                      width: 20,
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      border: "1px solid #aaa",
                      marginLeft:"2px",

                    }}
                  />
                </label>
                <button
                  className="nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleSign();
                  }}
                  style={{
                    fontSize: 10,
                    padding: "1px 4px",
                    borderRadius: 3,
                    width: 20,

                    background:
                      sign === null
                        ? "#fff"
                        : sign === "+"
                        ? "#e8f5e9"
                        : "#fdeaea",
                    lineHeight: 1.2,
                    marginLeft:"2px",
                  }}
                  title="Cycle sign: null → + → −"
                >
                  {sign === null ? "∅" : sign}
                </button>
              </>
            ) : 
            sign ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div>I: {impact}</div>
              <div>C: {control}</div>

              <button
                className="nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSign(); // + → − → null
                }}
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 999,
                  border: "1px solid #aaa",
                  background: sign === "+" ? "#e8f5e9" : "#fdeaea",
                  lineHeight: 1.2,
                }}
                title="Cycle sign: + → − → null"
              >
                {sign}
              </button>
            </div>
            ) : (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div>I: {impact}</div>
                <div>C: {control}</div>

                {sign && (
                  <button
                    className="nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleSign();
                    }}
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 999,
                      border: "1px solid #aaa",
                      background: sign === "+" ? "#e8f5e9" : "#fdeaea",
                    }}
                    title="Cycle sign: + → − → null"
                  >
                    {sign}
                  </button>
                )}
              </div>
            )}
          </div>
        </foreignObject>
      )}
      {editing && (
        <circle
          cx={labelPos.x - 60} // 10px left of the label box (label width is ~100)
          cy={labelPos.y - 5} // same vertical center
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
      )}
    </>
  );
}

export default FloatingEdge;
