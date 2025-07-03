import React, { useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";

export default function DDM() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    // Load nodes
    const storedNodes = localStorage.getItem("savedNodes");
    if (storedNodes) {
      try {
        setNodes(JSON.parse(storedNodes));
      } catch (err) {
        console.error("Failed to parse nodes:", err);
      }
    }

    // Load edges
    const storedEdges = localStorage.getItem("savedEdges");
    if (storedEdges) {
      try {
        setEdges(JSON.parse(storedEdges));
      } catch (err) {
        console.error("Failed to parse edges:", err);
      }
    }
  }, []);

  return (
    <div style={{ height: "90%", padding: 20 }}>
      <h2>Direct Dependency Matrix Page</h2>

      <h3>Nodes</h3>
      {nodes.length === 0 ? (
        <p>No nodes found in localStorage.</p>
      ) : (
        <ul>
          {nodes.map((node, index) => (
            <li key={node.id || index}>
              <strong>ID:</strong> {node.id} | <strong>Label:</strong>{" "}
              {node.data?.label || "Unnamed Node"}
            </li>
          ))}
        </ul>
      )}

      <h3>Edges</h3>
      {edges.length === 0 ? (
        <p>No edges found in localStorage.</p>
      ) : (
        <ul>
          {edges.map((edge, index) => (
            <li key={edge.id || index}>
              <strong>From:</strong> {edge.source} → <strong>To:</strong>{" "}
              {edge.target} | <strong>influence:</strong>{" "}
              {edge.data.influence || "No influence"} {" | "}
              {edge.data.control || "No control"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
