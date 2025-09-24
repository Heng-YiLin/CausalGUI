// src/components/Export.jsx
import React, { useRef } from "react";
import DownloadButton from "./DownloadButton";

function downloadBlob(data, filename, type = "application/json") {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Export() {
  const fileInputRef = useRef(null);

  const exportJson = () => {
    const nodes = JSON.parse(localStorage.getItem("savedNodes") || "[]");
    const edges = JSON.parse(localStorage.getItem("savedEdges") || "[]");
    const payload = { nodes, edges, exportedAt: new Date().toISOString() };
    downloadBlob(JSON.stringify(payload, null, 2), "cld-nodes-edges.json");
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result || "{}");
        const nodes = Array.isArray(data.nodes) ? data.nodes : [];
        const edges = Array.isArray(data.edges) ? data.edges : [];
        localStorage.setItem("savedNodes", JSON.stringify(nodes));
        localStorage.setItem("savedEdges", JSON.stringify(edges));
        window.dispatchEvent(new Event("storage-update"));
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