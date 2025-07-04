import React, { useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";

export default function DDM() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const storedNodes = localStorage.getItem("savedNodes");
    const storedEdges = localStorage.getItem("savedEdges");

    if (storedNodes) {
      try {
        setNodes(JSON.parse(storedNodes));
      } catch (err) {
        console.error("Failed to parse nodes:", err);
      }
    }

    if (storedEdges) {
      try {
        setEdges(JSON.parse(storedEdges));
      } catch (err) {
        console.error("Failed to parse edges:", err);
      }
    }
  }, []);

  const persistEdges = (updatedEdges) => {
    setEdges(updatedEdges);
    localStorage.setItem("savedEdges", JSON.stringify(updatedEdges));
  };

  const getEdge = (source, target) =>
    edges.find((e) => e.source === source && e.target === target);

  const handleEdgeChange = (source, target, influence, control) => {
    const existingEdge = getEdge(source, target);

    if ((influence === 0 && control === 0) || (isNaN(influence) && isNaN(control))) {
      const newEdges = edges.filter(
        (e) => !(e.source === source && e.target === target)
      );
      persistEdges(newEdges);
      return;
    }

    const newData = {
      influence,
      control,
    };

    if (existingEdge) {
      const updatedEdge = { ...existingEdge, data: { ...existingEdge.data, ...newData } };
      persistEdges(
        edges.map((e) =>
          e.source === source && e.target === target ? updatedEdge : e
        )
      );
    } else {
      const newEdge = {
        id: `${source}-${target}`,
        source,
        target,
        data: newData,
      };
      persistEdges([...edges, newEdge]);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      {nodes.length === 0 ? (
        <p>No nodes found in localStorage.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            tableLayout: "fixed",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
            <th style={{ border: "1px solid #ccc", padding: 5 }}>&nbsp;</th>
              {nodes.map((colNode) => (
                <th
                  key={`group-${colNode.id}`}
                  colSpan={2}
                  style={{
                    border: "1px solid #ccc",
                    padding: 5,
                    textAlign: "center",
                  }}
                >
                  {colNode.data?.label || colNode.id}
                </th>
              ))}
            </tr>
            <tr>
            <th style={{ border: "1px solid #ccc", padding: 5 }}>&nbsp;</th>
              {nodes.map((colNode) => (
                <React.Fragment key={`subhead-${colNode.id}`}>
                  <th style={{ border: "1px solid #ccc", padding: 5, textAlign: "center" }}>I</th>
                  <th style={{ border: "1px solid #ccc", padding: 5, textAlign: "center" }}>C</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>


          <tbody>
            {nodes.map((rowNode) => (
              <tr key={rowNode.id}>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: 5,
                    textAlign: "left",
                  }}
                >
                  {rowNode.data?.label || rowNode.id}
                </th>
                {nodes.map((colNode) => {
                  const edge = getEdge(rowNode.id, colNode.id);
                  const influence = edge?.data?.influence ?? 0;
                  const control = edge?.data?.control ?? 0;

                  const type =
                    edge?.data?.control === "C"
                      ? "C"
                      : edge?.data?.influenceType === "I"
                        ? "I"
                        : "";

                  return (
                    <>
                      <td
                        key={colNode.id}
                        style={{
                          border: "1px solid #ddd",
                          textAlign: "center",
                          padding: 4,
                          fontSize: 12,
                        }}
                      >
                        {(influence > 0 || control > 0) ? (
                          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                            {influence > 0 && <span>{influence}</span>}
                          </div>
                        ) : null}
                      </td>
                      <td
                        key={colNode.id}
                        style={{
                          border: "1px solid #ddd",
                          textAlign: "center",
                          padding: 4,
                          fontSize: 12,
                        }}
                      >
                        {(influence > 0 || control > 0) ? (
                          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                            {control > 0 && <span>{control}</span>}
                          </div>
                        ) : null}
                      </td>
                    </>


                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
