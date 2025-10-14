import React, { useState, useEffect, useMemo } from "react";
import CLD from "./components/CLD";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import DDM from "./components/DDM";
import FactorClassGraph from "./components/FactorClassGraph";
import PM from "./components/PM";
import LoopID from "./components/LoopID";
import Export from "./components/Export";
import LOI from "./components/LOI";

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
      impact: typeof edge.data?.impact === "number" ? edge.data.impact : 0,
      control: typeof edge.data?.control === "number" ? edge.data.control : 0,
      offset: typeof edge.data?.offset === "number" ? edge.data.offset : 0,
    },
    ...edge,
  }));

const persist = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to persist ${key} to localStorage`, err);
  }
};

// Compute pairwise weights W = alpha*Impact + (1-alpha)*Control
// Returns { alpha, ids, index, matrix, get }
const computePairwise = (nodes = [], edges = [], alpha = 0.5) => {
  const ids = nodes.map((n) => n.id);
  const index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (const e of edges) {
    const i = index[e.source];
    const j = index[e.target];
    if (i == null || j == null) continue;
    const I = Number.isFinite(Number(e?.data?.impact))
      ? Number(e.data.impact)
      : 0;
    const C = Number.isFinite(Number(e?.data?.control))
      ? Number(e.data.control)
      : 0;
    const w = alpha * I + (1 - alpha) * C;
    matrix[i][j] = Math.round(w * 1000) / 1000; // 3 decimals
  }

  const get = (srcId, tgtId) => {
    const i = index[srcId];
    const j = index[tgtId];
    if (i == null || j == null) return 0;
    return matrix[i][j];
  };

  return { alpha, ids, index, matrix, get };
};

export default function App() {
  const [nodes, setNodes] = useState(() => {
    const raw = JSON.parse(localStorage.getItem("savedNodes") || "[]");
    return sanitizeNodes(raw);
  });

  const [edges, setEdges] = useState(() => {
    const raw = JSON.parse(localStorage.getItem("savedEdges") || "[]");
    return sanitizeEdges(raw);
  });

  // Global impact weight — default from first node if present, else 0.5
  const [impactWeight, setImpactWeight] = useState(() => {
    try {
      const first = (JSON.parse(localStorage.getItem("savedNodes") || "[]") ||
        [])[0];
      const w = first?.data?.metrics?.impactWeight;
      const n = Number(w);
      return Number.isFinite(n) ? n : 0.5;
    } catch {
      return 0.5;
    }
  });

  // Compute derived pairwise weights (not persisted)
  const pairwise = useMemo(
    () => computePairwise(nodes, edges, impactWeight),
    [nodes, edges, impactWeight]
  );

  // Function to update an edge's data and persist to localStorage
  const updateEdgeData = (edgeId, patch) => {
    setEdges((curr) => {
      const next = curr.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e
      );
      try {
        localStorage.setItem("savedEdges", JSON.stringify(next));
        window.dispatchEvent(new Event("storage-update"));
      } catch (err) {
        console.warn("Failed to persist edges to localStorage", err);
      }
      return next;
    });
  };

  // Persist nodes & edges whenever they change
  useEffect(() => {
    persist("savedNodes", nodes);
    persist("savedEdges", edges);
  }, [nodes, edges]);

  // Light validation logs
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

        localStorage.setItem("savedNodes", JSON.stringify(importedNodes));
        localStorage.setItem("savedEdges", JSON.stringify(importedEdges));

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
      <div
        className="pt-30"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
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
                <DDM
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  impactWeight={impactWeight}
                  setImpactWeight={setImpactWeight}
                />
              }
            />

            <Route
              path="/FactorClassGraph"
              element={
                <FactorClassGraph
                  nodes={nodes}
                  edges={edges}
                  impactWeight={impactWeight}
                  onChangeImpactWeight={setImpactWeight}
                />
              }
            />

            <Route
              path="/PM"
              element={
                <PM
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                />
              }
            />

            <Route
              path="/LoopID"
              element={
                <LoopID
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  onUpdateEdgeData={updateEdgeData}
                  editable
                />
              }
            />
            <Route
              path="/LOI"
              element={
                <LOI
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  impactWeight={impactWeight}
                  pairwise={pairwise}
                  
                />
              }
            />
            <Route
              path="/Export"
              element={
                <Export
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  onUpdateEdgeData={updateEdgeData}
                  editable
                />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
