// src/components/Export.jsx
import React, { useRef } from "react";

function downloadBlob(data, filename, type = "application/json") {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export / Import controls for Nodes & Edges persisted in localStorage.
 *
 * Props (all optional):
 * - setNodes(array): immediately update app state after import
 * - setEdges(array): immediately update app state after import
 * - onImported({nodes, edges}): callback after successful import
 * - storageKeys: { nodesKey: string, edgesKey: string }
 */
export default function Export({ setNodes, setEdges, onImported, storageKeys }) {
  const fileInputRef = useRef(null);
  const nodesKey = storageKeys?.nodesKey || "savedNodes";
  const edgesKey = storageKeys?.edgesKey || "savedEdges";

  const exportJson = () => {
    const nodes = JSON.parse(localStorage.getItem(nodesKey) || "[]");
    const edges = JSON.parse(localStorage.getItem(edgesKey) || "[]");
    const payload = { nodes, edges, exportedAt: new Date().toISOString() };
    downloadBlob(JSON.stringify(payload, null, 2), "cld-nodes-edges.json");
  };

  const emitStorageUpdate = (nodes, edges) => {
    // Use CustomEvent so the same-tab listeners can react without relying on the native 'storage' event.
    try {
      window.dispatchEvent(
        new CustomEvent("storage-update", { detail: { nodes, edges } })
      );
    } catch (_) {
      // Fallback to a plain Event if CustomEvent is unavailable (older browsers/environments)
      window.dispatchEvent(new Event("storage-update"));
    }
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "{}");
        const data = JSON.parse(raw);
        // Accept either {nodes, edges} or {savedNodes, savedEdges}
        const nodes = Array.isArray(data.nodes)
          ? data.nodes
          : Array.isArray(data.savedNodes)
          ? data.savedNodes
          : [];
        const edges = Array.isArray(data.edges)
          ? data.edges
          : Array.isArray(data.savedEdges)
          ? data.savedEdges
          : [];

        // Persist to localStorage
        localStorage.setItem(nodesKey, JSON.stringify(nodes));
        localStorage.setItem(edgesKey, JSON.stringify(edges));

        // Immediately update in-memory React state if setters are provided
        if (typeof setNodes === "function") setNodes(nodes);
        if (typeof setEdges === "function") setEdges(edges);

        // Let any listeners know
        emitStorageUpdate(nodes, edges);

        // Callback for parent/UI
        if (typeof onImported === "function") onImported({ nodes, edges });

        alert("Imported nodes & edges successfully.");
      } catch (e) {
        console.error(e);
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Export JSON */}
      <button
        onClick={exportJson}
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
        }}
      >
        Export Nodes & Edges (JSON)
      </button>

      {/* Import JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importJson(file);
          // reset input so the same file can be selected again
          e.currentTarget.value = "";
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
        }}
      >
        Import Nodes & Edges (JSON)
      </button>
    </div>
  );
}