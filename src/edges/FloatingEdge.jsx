import { useInternalNode, useReactFlow } from "@xyflow/react";
import { getEdgeParams } from "./initalElements.js";
import { useState, useRef, useEffect } from "react";
import { Plus, Minus, CircleOff } from "lucide-react";

function getQuadraticPath(sx, sy, tx, ty, cx, cy) {
  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
}

function FloatingEdge({ id, source, target, markerEnd, style, data }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { setEdges } = useReactFlow();

  const pathRef = useRef(null);
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);
  const labelRef = useRef(null);
  const handleRef = useRef(null);
  const ignoreNextOutside = useRef(false);
  const isDragging = useRef(false);

  if (!sourceNode || !targetNode || !data || typeof data !== "object") {
    return null;
  }

  const sign = data?.sign ?? null;
  const impact = data?.impact ?? null;
  const control = data?.control ?? null;
  const offset = data?.offset ?? 40;

  const strokeColor =
    sign === "+" ? "#16a34a" : sign === "-" ? "#dc2626" : "#b1b1b7";

  function nextImpact(val) {
    const options = [null, 1, 2, 3];
    const idx = options.indexOf(val);
    return options[(idx + 1) % options.length];
  }

  function nextControl(val) {
    const options = [null, 0, 1, 2, 3];
    const idx = options.indexOf(val);
    return options[(idx + 1) % options.length];
  }

  const handleImpactClick = () => {
    setEdges((eds) => {
      const cur = eds.find((e) => e.id === id);
      const currentVal = cur?.data?.impact ?? null;
      const nextVal = nextImpact(currentVal);
      if (nextVal === null) {
        // If impact cycles to null, delete the edge entirely
        return eds.filter((e) => e.id !== id);
      }
      return eds.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, impact: nextVal } } : e
      );
    });
  };

  const handleControlClick = () => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id
          ? { ...e, data: { ...e.data, control: nextControl(e.data?.control) } }
          : e
      )
    );
  };

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
  const handleEdgeClick = (e) => {
    setEditing((prev) => !prev);
  };

  // --- Build path + drag projector (quadratic only) ---
  let edgePath = "";
  let dragProjector = (dx, dy) => 0;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
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
    updateEdgeData("offset", startOffset + projected);
  };
  useEffect(() => {
    if (!editing) return;

    const onDown = (e) => {
      if (ignoreNextOutside.current) {
        ignoreNextOutside.current = false;
        return;
      }

      const path = typeof e.composedPath === "function" ? e.composedPath() : [];

      const insideLabel =
        labelRef.current &&
        (labelRef.current.contains(e.target) ||
          path.includes(labelRef.current));

      const insideHandle =
        handleRef.current &&
        (handleRef.current === e.target || path.includes(handleRef.current));

      if (!insideLabel && !insideHandle) {
        setEditing(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setEditing(false);
    };

    // ADD listeners (bubble phase)
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      // REMOVE listeners
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  return (
    <>
    {/* Invisible thick path for easier interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        pointerEvents="stroke"
        className="react-flow__edge-interaction"
      />
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

      {(editing || sign !== null || impact !== null || control !== null) && (
        <foreignObject
          width={100}
          height={40}
          x={labelPos.x - 50}
          y={labelPos.y - 20}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            ref={labelRef}
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
              e.stopPropagation();
              if (!editing) {
                e.preventDefault();
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
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {editing ? (
              <>
                <label>
                  I:
                  <button
                    className="nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImpactClick();
                    }}
                    style={{
                      marginLeft: 2,
                      height: 18,
                      width: 28,
                      fontSize: 10,
                      border: "1px solid #aaa",
                      borderRadius: 3,
                      background: "#f9f9f9",
                      cursor: "pointer",
                    }}
                  >
                    I: {impact ?? "∅"}
                  </button>
                </label>

                <button
                  className="nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleControlClick();
                  }}
                  style={{
                    marginLeft: 2,
                    height: 18,
                    width: 28,
                    fontSize: 10,
                    border: "1px solid #aaa",
                    borderRadius: 3,
                    background: "#f9f9f9",
                    cursor: "pointer",
                  }}
                >
                  C: {control ?? "∅"}
                </button>
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
      {(editing || isDragging.current) && (
        <circle
          className="nodrag nopan"
          ref={handleRef}
          cx={labelPos.x - 60} // 10px left of the label box (label width is ~100)
          cy={labelPos.y - 5} // same vertical center
          r={7}
          fill="#fff"
          stroke="#333"
          strokeWidth={1.5}
          onClick={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{ cursor: "grab", pointerEvents: "all", touchAction: "none" }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ignoreNextOutside.current = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
            const startX = e.clientX;
            const startY = e.clientY;
            const startOffset = offset;

            const onMove = (moveEvent) => {
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;
              onOffsetPointerDrag(startOffset, dx, dy);
            };

            const onUp = () => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              isDragging.current = false;
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
