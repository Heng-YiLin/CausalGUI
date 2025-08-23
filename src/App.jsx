import React, { useState, useEffect } from "react";
import CLD from "./components/CLD";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import About from "./components/DDM";
import Contact from "./components/FactorClassGraph";

export default function App() {
  const sanitizeNodes = (nodes) =>
    (nodes || []).map((node) => ({
      id: node.id ?? crypto.randomUUID(),
      type: node.type ?? "custom",
      position: node.position ?? { x: 0, y: 0 },
      data: {
        label: node.data?.label ?? "Unnamed",
        ...node.data,
      },
      ...node,
    }));
  const sanitizeEdges = (edges) =>
    (edges || []).map((edge) => ({
      id: edge.id ?? `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type ?? "floating",
      data: {
        ...edge.data,
        label: typeof edge.data?.label === "string" ? edge.data.label : "",
        influence:
          typeof edge.data?.influence === "number" ? edge.data.influence : 0,
        control: typeof edge.data?.control === "number" ? edge.data.control : 0,
        offset: typeof edge.data?.offset === "number" ? edge.data.offset : 0,
      },
      ...edge,
    }));

  const [nodes, setNodes] = useState(() => {
    const raw = JSON.parse(localStorage.getItem("savedNodes") || "[]");
    return sanitizeNodes(raw);
  });

  const [edges, setEdges] = useState(() => {
    const raw = JSON.parse(localStorage.getItem("savedEdges") || "[]");
    return sanitizeEdges(raw);
  });

  useEffect(() => {
    localStorage.setItem("savedNodes", JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem("savedEdges", JSON.stringify(edges));
  }, [edges]);

  useEffect(() => {
    for (const n of nodes) {
      if (!n?.data || typeof n.data.label !== "string") {
        console.warn("⚠️ Invalid node label", n);
      }
    }

    for (const e of edges) {
      if (!e?.data || typeof e.data.label !== "string") {
        console.warn("⚠️ Invalid edge label", e);
      }
    }
  }, [nodes, edges]);
  const handleJsonImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedNodes = sanitizeNodes(parsed.nodes || []);
        const importedEdges = sanitizeEdges(parsed.edges || []);

        // Save to localStorage
        localStorage.setItem("savedNodes", JSON.stringify(importedNodes));
        localStorage.setItem("savedEdges", JSON.stringify(importedEdges));

        // Update state
        setNodes(importedNodes);
        setEdges(importedEdges);
      } catch (error) {
        console.error("Invalid JSON file:", error);
        alert("Failed to import JSON: Invalid format.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <Router>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header onImportJson={handleJsonImport} />

        <div style={{ flex: 1, minHeight: 0 }}>
          <Routes>
            <Route
              path="/"
              element={
                <CLD
                  nodes={nodes}
                  setNodes={setNodes}
                  edges={edges}
                  setEdges={setEdges}
                />
              }
            />
            <Route
              path="/DDM"
              element={
                <About
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                />
              }
            />
            <Route path="/FactorClassGraph" element={<Contact />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
