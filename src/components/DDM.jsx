import React, { useEffect, useState, useRef } from "react";
import "@xyflow/react/dist/style.css";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { themeBalham } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { parseExcelFile } from "./excelImporter";

export default function DDMGrid({ nodes, edges, setNodes, setEdges }) {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);

  // Excel Import
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      parseExcelFile(file, setColumnDefs, setRowData, setNodes, setEdges);
    }
  };

  // Reuse these in both "I" and "C" columns
  const numericValueSetter = (p) => {
    const raw = (p.newValue ?? "").toString().trim();
    if (raw === "") {
      p.data[p.colDef.field] = null; // <-- store null when cleared
      return true;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) {
      p.data[p.colDef.field] = n; // keep numbers as numbers (0 allowed)
      return true;
    }
    return false; // reject non-numeric
  };

  const blankNullFormatter = (p) =>
    p.value === null || p.value === undefined ? "" : p.value;

  const CYCLE_ORDER = {
    I: [null, 1, 2, 3],
    C: [null, 0, 1, 2, 3],
  };

  const nextCycleValue = (type, current) => {
    const arr = CYCLE_ORDER[type];
    const cur = current === undefined ? null : current;
    const idx = arr.findIndex((v) => v === cur);
    return arr[idx === -1 ? 0 : (idx + 1) % arr.length];
  };

  const rebuildMatrix = (nodeList, edgeList) => {
    const columns = [
      {
        headerName: "",
        field: "rowLabel",
        pinned: "left",
        editable: true,
      },
      ...nodeList.map((node) => ({
        headerName: node.data?.label || node.id,
        children: [
          {
            headerName: "I",
            field: `${node.id}_I`,
            editable: false,
            valueSetter: numericValueSetter,
            valueFormatter: blankNullFormatter,
            cellClass: "cycle-cell",
            tooltipValueGetter: () =>
              "Click to cycle through values: null → 1 → 2 → 3",
          },
          {
            headerName: "C",
            field: `${node.id}_C`,
            editable: false,
            cellClass: "cycle-cell",
            valueSetter: numericValueSetter,
            valueFormatter: blankNullFormatter,
            tooltipValueGetter: () =>
              "Click to cycle through values: null → 0 → 1 → 2 → 3",
          },
        ],
      })),
    ];

    const rows = nodeList.map((rowNode) => {
      const row = { rowLabel: rowNode.data?.label || rowNode.id };
      nodeList.forEach((colNode) => {
        const edge = edgeList.find(
          (e) => e.source === rowNode.id && e.target === colNode.id
        );
        row[`${colNode.id}_I`] = edge?.data?.impact ?? null;
        row[`${colNode.id}_C`] = edge?.data?.control ?? null;
      });
      return row;
    });

    rows.push({ rowLabel: "" });
    setColumnDefs(columns);

    setRowData(rows);
  };
  // === Initialize matrix from props ===
  useEffect(() => {
    if (!Array.isArray(nodes) || !nodes.length) return;
    rebuildMatrix(nodes, edges || []);
  }, [nodes, edges]);

  // === Get next available node ID ===
  const getNextNodeId = () => {
    const maxId = nodes
      .map((n) => parseInt(n.id, 10))
      .filter((n) => !isNaN(n))
      .reduce((max, curr) => Math.max(max, curr), 0);
    return String(maxId + 1);
  };

  // === Handle editing cells ===
  const handleCellChange = (params) => {
    const { data, colDef } = params;
    const [colNodeId] = colDef.field.split("_");
    const rowLabel = (data.rowLabel || "").trim();

    const sourceNode = nodes.find((n) => (n.data?.label || n.id) === rowLabel);
    if (!sourceNode || !colNodeId) return;

    // Pull BOTH values from the already-updated row
    const rawI = data[`${colNodeId}_I`];
    const rawC = data[`${colNodeId}_C`];

    const impact = rawI === null || rawI === "" ? null : Number(rawI);
    const control = rawC === null || rawC === "" ? null : Number(rawC);

    setEdges((prev) => {
      const next = [...prev];
      const rowNodeId = sourceNode.id;
      const idx = next.findIndex(
        (e) => e.source === rowNodeId && e.target === colNodeId
      );

      const bothEmpty = impact === null && control === null;

      if (bothEmpty) {
        if (idx !== -1) next.splice(idx, 1); // delete edge
      } else if (idx !== -1) {
        next[idx] = {
          ...next[idx],
          data: { ...next[idx].data, impact, control },
        };
      } else {
        next.push({
          id: `${rowNodeId}-${colNodeId}`,
          source: rowNodeId,
          target: colNodeId,
          data: { impact, control },
        });
      }

      // persist
      localStorage.setItem("savedEdges", JSON.stringify(next));
      window.dispatchEvent(new Event("storage-update"));
      return next;
    });
  };

  const handleCellClick = (params) => {
    const field = params.colDef?.field;
    if (!field) return;
    const parts = field.split("_");
    const suffix = parts[1];
    if (suffix !== "I" && suffix !== "C") return; // only cycle on I/C columns
    const current = params.data[field] ?? null;
    const next = nextCycleValue(suffix, current);
    params.node.setDataValue(field, next); // triggers handleCellChange
  };
  // === CSV Export Trigger ===
  useEffect(() => {
    const exportHandler = () => {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: "DDM-edges.csv",
        });
      }
    };

    window.addEventListener("ddm-export-csv", exportHandler);
    return () => window.removeEventListener("ddm-export-csv", exportHandler);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
      </div>
      <div style={{ height: `calc(100vh - 150px)`, width: "100%" }}>
        <AgGridReact
          theme={themeBalham}
          rowData={rowData}
          ref={gridRef}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellChange}
          onCellClicked={handleCellClick}
          stopEditingWhenCellsLoseFocus={true}
          singleClickEdit={false}
          defaultColDef={{ resizable: true, width: 80, editable: true }}
        />
      </div>
    </div>
  );
}
