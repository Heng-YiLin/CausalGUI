import React, { useEffect, useState, useRef } from "react";
import "@xyflow/react/dist/style.css";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { themeBalham } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

export default function DDMPolarityGrid({ nodes, edges, setNodes, setEdges }) {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);

  // === Build matrix with ONLY polarity (± or empty) ===
  const rebuildMatrix = (nodeList, edgeList) => {
    const columns = [
      {
        headerName: "",
        field: "rowLabel",
        pinned: "left",
        editable: false,
        width: 160,
      },
      ...nodeList.map((node) => ({
        headerName: node.data?.label || node.id,
        field: `${node.id}_POL`,
        editable: false,
        cellClass: "polarity-cell",
        cellStyle: {
          textAlign: "center",
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
        },
        valueFormatter: (p) =>
          p.value === "+" || p.value === "-" ? p.value : "",
      })),
    ];

    const rows = nodeList.map((rowNode) => {
      const row = { rowLabel: rowNode.data?.label || rowNode.id };
      nodeList.forEach((colNode) => {
        const edge = edgeList.find(
          (e) => e.source === rowNode.id && e.target === colNode.id
        );
        row[`${colNode.id}_POL`] = edge?.data?.sign ?? null;
      });
      return row;
    });

    rows.push({ rowLabel: "" });
    setColumnDefs(columns);
    setRowData(rows);
  };

  useEffect(() => {
    if (!Array.isArray(nodes) || !nodes.length) return;
    rebuildMatrix(nodes, edges || []);
  }, [nodes, edges]);

  const nodeIdByLabelOrId = (labelOrId) =>
    nodes.find((n) => (n.data?.label || n.id) === labelOrId)?.id ?? null;

  const cycleSign = (current) =>
    current === null ? "+" : current === "+" ? "-" : null;

  const handleCellClicked = (params) => {
    const { colDef, data } = params;
    if (!colDef.field || colDef.field === "rowLabel") return;

    const [colNodeId] = colDef.field.split("_");
    const rowLabel = (data.rowLabel || "").trim();
    const sourceId = nodeIdByLabelOrId(rowLabel);
    if (!sourceId || !colNodeId) return;
    if (sourceId === colNodeId) return; // skip self-links

    const field = `${colNodeId}_POL`;
    const current = data[field] ?? null;
    const nextSign = cycleSign(current);

    // Update UI
    setRowData((prev) =>
      prev.map((r) => (r === data ? { ...r, [field]: nextSign } : r))
    );

    // Update edges
    setEdges((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (e) => e.source === sourceId && e.target === colNodeId
      );

      if (nextSign === null) {
        if (idx !== -1) next.splice(idx, 1);
      } else if (idx !== -1) {
        next[idx] = {
          ...next[idx],
          data: { ...next[idx].data, sign: nextSign },
        };
      } else {
        next.push({
          id: `${sourceId}-${colNodeId}`,
          source: sourceId,
          target: colNodeId,
          data: { sign: nextSign },
        });
      }

      localStorage.setItem("savedEdges", JSON.stringify(next));
      window.dispatchEvent(new Event("storage-update"));
      return next;
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ height: `calc(100vh - 150px)`, width: "100%" }}>
        <AgGridReact
          theme={themeBalham}
          rowData={rowData}
          ref={gridRef}
          columnDefs={columnDefs}
          onCellClicked={handleCellClicked}
          stopEditingWhenCellsLoseFocus={true}
          singleClickEdit={false}
          suppressClickEdit={true}
          defaultColDef={{ resizable: true, width: 70, editable: false }}
        />
      </div>
    </div>
  );
}
