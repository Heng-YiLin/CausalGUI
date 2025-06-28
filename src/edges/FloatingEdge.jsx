import { useInternalNode, useReactFlow } from "@xyflow/react";
import { getEdgeParams } from "./initalElements.js";
import { useState, useRef, useEffect } from "react";

function getArcPath(sx, sy, tx, ty, radius = 150) {
  const dx = tx - sx;
  const dy = ty - sy;
  const sweepFlag = dx * dy < 0 ? 0 : 1;
  return `M ${sx} ${sy} A ${radius} ${radius} 0 0 ${sweepFlag} ${tx} ${ty}`;
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
  const edgePath = getArcPath(sx, sy, tx, ty, 150);

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
                    type="text"
                    value={influence}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^-?\d*\.?\d*$/.test(value)) {
                        updateEdgeData("influence", value);
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
                    type="text"
                    value={control}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^-?\d*\.?\d*$/.test(value)) {
                        updateEdgeData("control", value);
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <div
                  onClick={handleEdgeClick}
                  style={{ cursor: "pointer", paddingLeft: "5px" }}
                >
                  I: {influence}
                </div>
                <div
                  onClick={handleEdgeClick}
                  style={{ cursor: "pointer", paddingRight: "5px" }}
                >
                  C: {control}
                </div>
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </>
  );
}

export default FloatingEdge;
