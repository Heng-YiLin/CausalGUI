import React, { useState, useEffect } from "react";
import CLD from "./components/CLD";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import About from "./components/DDM";
import Contact from "./components/FactorClassGraph";

export default function App() {
  const [nodes, setNodes] = useState(() => {
    return JSON.parse(localStorage.getItem("savedNodes") || "[]");
  });

  const [edges, setEdges] = useState(() => {
    return JSON.parse(localStorage.getItem("savedEdges") || "[]");
  });

  useEffect(() => {
    localStorage.setItem("savedNodes", JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem("savedEdges", JSON.stringify(edges));
  }, [edges]);

  const handleJsonImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedNodes = parsed.nodes || [];
        const importedEdges = parsed.edges || [];

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
