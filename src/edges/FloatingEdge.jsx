import { useInternalNode, useReactFlow } from "@xyflow/react";
import { getEdgeParams } from "./initalElements.js";
import { useState, useRef, useEffect } from "react";
import { Plus, Minus, CircleOff } from "lucide-react";

function getQuadraticPath(sx, sy, tx, ty, cx, cy) {
  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
}

function getNodeCenter(node) {
  const ax = node?.internals?.positionAbsolute?.x ?? node?.position?.x ?? 0;
  const ay = node?.internals?.positionAbsolute?.y ?? node?.position?.y ?? 0;
  const w = node?.width ?? node?.measured?.width ?? 0;
  const h = node?.height ?? node?.measured?.height ?? 0;
  return { cx: ax + w / 2, cy: ay + h / 2, w, h, ax, ay };
}

// Circle self-loop that STARTS & ENDS on the node border (tangent at bottom-left corner).
// long=true  => 270° arc (big loop). long=false => 90° arc (small loop).
// pad=0 touches the border exactly; increase pad (e.g. 6–10) to draw just outside the node.
// Circular self-loop at bottom-left with FIXED endpoints on the node border.
// offset -> radius (R). gap -> how far from the corner along each edge.
// pad -> 0 touches border; >0 draws just outside to avoid overlap/shadow.
// Circular self-loop at bottom-left with FIXED endpoints on the node border.
// radius -> circle radius (use your data.offset). gap -> distance from corner along edges.
// pad -> 0 touches the border; >0 draws just outside the node (avoid node shadow).
function getSelfLoopCircleFixedBL(
  node,
  { radius = 40, gap = 14, pad = 0, long = true, clockwise = false } = {}
) {
  const { cx, cy, w, h } = getNodeCenter(node);
  const R = Math.max(16, Math.min(400, Math.abs(radius || 40)));

  const left = cx - w / 2;
  const bottom = cy + h / 2;

  // Fixed endpoints (do NOT depend on R)
  const sx = left - pad; // on/just outside left edge
  const sy = bottom - gap; // up from the corner
  const ex = left + gap; // right from the corner
  const ey = bottom + pad; // on/just outside bottom edge

  // Ensure radius is valid for this chord
  const chord = Math.hypot(ex - sx, ey - sy);
  const effR = Math.max(R, chord / 2 + 0.1);

  const largeArcFlag = long ? 1 : 0; // 270° vs 90°
  const sweepFlag = clockwise ? 1 : 0;

  const path = `M ${sx} ${sy} A ${effR} ${effR} 0 ${largeArcFlag} ${sweepFlag} ${ex} ${ey}`;
  return { path };
}

function FloatingEdge({ id, source, target, markerEnd, style, data }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { setEdges } = useReactFlow();

  const pathRef = useRef(null);
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);

  if (!sourceNode || !targetNode || !data || typeof data !== "object") {
    return null;
  }

  const sign = data?.sign ?? null;
  const impact = data?.impact ?? 0;
  const control = data?.control ?? 0;
  const offset = data?.offset ?? 40;
  const isSelfLoop = source === target;

  const strokeColor =
    sign === "+" ? "#16a34a" : sign === "-" ? "#dc2626" : "#b1b1b7";

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
    const next = sign === null ? "+" : sign === "+" ? "-" : null;
    updateEdgeData("sign", next);
  };
  const handleEdgeClick = () => setEditing(true);
  const handleBlur = () => setEditing(false);

  // --- Build path + drag projector ---
  let edgePath = "";
  let dragProjector = (dx, dy) => 0; // maps mouse delta to offset delta
  if (isSelfLoop) {
    const { path } = getSelfLoopCircleFixedBL(sourceNode, {
      radius: Number(offset) || 40, // <- make sure it's a number
      gap: data?.gap ?? 14,
      pad: data?.pad ?? 0,
      long: true, // 270° loop (false => 90°)
      clockwise: false, // flip if you want the other direction
    });
    edgePath = path;
    dragProjector = (_dx, dy) => dy; // vertical drag adjusts radius
  } else {
    const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode); // <-- declared with const here
    if (
      [sx, sy, tx, ty].some((v) => typeof v !== "number" || isNaN(v)) ||
      !sourceNode.position ||
      !targetNode.position
    ) {
      return null;
    }

    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const cx = mx + perpX * offset;
    const cy = my + perpY * offset;

    edgePath = getQuadraticPath(sx, sy, tx, ty, cx, cy);
    dragProjector = (dxDrag, dyDrag) => dxDrag * perpX + dyDrag * perpY;
  }

  // Auto label pos from path midpoint (works for both)
  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      const midpoint = pathRef.current.getPointAtLength(length / 2);
      setLabelPos({ x: midpoint.x, y: midpoint.y });
    }
  }, [edgePath]);
  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      const midpoint = pathRef.current.getPointAtLength(length / 2);
      setLabelPos({ x: midpoint.x, y: midpoint.y });
    }
  }, [edgePath]);
  const onOffsetPointerDrag = (startOffset, dx, dy) => {
    const projected = dragProjector(dx, dy);
    if (isSelfLoop) {
      const next = Math.max(24, Math.min(160, startOffset + projected));
      updateEdgeData("offset", next);
    } else {
      updateEdgeData("offset", startOffset + projected);
    }
  };

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
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;
                  const projected = dragProjector(dx, dy); // dy for self-loop
                  const next = Math.max(
                    16,
                    Math.min(400, startOffset + projected)
                  );
                  updateEdgeData("offset", next); // radius updates here
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
                      height: 18,
                      width: 20,
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      border: "1px solid #aaa",
                      marginLeft: "2px",
                    }}
                  />
                </label>
                <label style={{ marginLeft: "2px" }}>
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
                      height: 18,
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      border: "1px solid #aaa",
                      marginLeft: "2px",
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
                    marginLeft: 2,
                    height: 18,
                    width: 20,
                    padding: 0, // let icon size define inner look
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1, // remove weird text line spacing
                    borderRadius: 4,
                    border: "1px solid #aaa",
                    background:
                      sign === "+"
                        ? "#e8f5e9"
                        : sign === "-"
                        ? "#fdeaea"
                        : "#fff",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  }}
                  title="Cycle sign: null → + → −"
                >
                  {sign === "+" ? (
                    <Plus size={10} />
                  ) : sign === "-" ? (
                    <Minus size={10} />
                  ) : (
                    <CircleOff size={10} />
                  )}
                </button>
              </>
            ) : sign ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div>I: {impact}</div>
                <div>C: {control}</div>
                <button
                  className="nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleSign();
                  }}
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: "1px solid #aaa",
                    background: sign === "+" ? "#e8f5e9" : "#fdeaea",
                    lineHeight: "12px",
                    textAlign: "center",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "15px",
                    verticalAlign: "middle",
                  }}
                  title="Cycle sign: + → − → null"
                >
                  {sign === "+" ? (
                    <Plus size={10} />
                  ) : sign === "-" ? (
                    <Minus size={10} />
                  ) : (
                    <CircleOff size={10} />
                  )}
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
                    {sign === "+" ? (
                      <Plus size={10} />
                    ) : sign === "-" ? (
                      <Minus size={10} />
                    ) : (
                      <CircleOff size={10} />
                    )}
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
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;
              onOffsetPointerDrag(startOffset, dx, dy);
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
