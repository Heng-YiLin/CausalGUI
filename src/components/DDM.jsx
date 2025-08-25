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
            editable: true,
            valueSetter: (params) => {
              const val = params.newValue;
              if (val === "") {
                params.data[params.colDef.field] = "";
                return true;
              }
              const parsed = parseInt(val, 10);
              if (!isNaN(parsed)) {
                params.data[params.colDef.field] = parsed;
                return true;
              }
              return false;
            },
            valueFormatter: (params) =>
              params.value === "" || params.value === null || isNaN(params.value)
                ? ""
                : params.value,
          },
          {
            headerName: "C",
            field: `${node.id}_C`,
            editable: true,
            valueSetter: (params) => {
              const val = params.newValue;
              if (val === "") {
                params.data[params.colDef.field] = "";
                return true;
              }
              const parsed = parseInt(val, 10);
              if (!isNaN(parsed)) {
                params.data[params.colDef.field] = parsed;
                return true;
              }
              return false;
            },
            valueFormatter: (params) =>
              params.value === "" || params.value === null || isNaN(params.value)
                ? ""
                : params.value,
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
        row[`${colNode.id}_I`] = edge?.data?.influence ?? null;
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
    const [colNodeId, type] = colDef.field.split("_");
    const rowLabel = data.rowLabel?.trim();
  
    const sourceNode = nodes.find((n) => (n.data?.label || n.id) === rowLabel);
    if (!sourceNode || !colNodeId) return;
  
    const rowNodeId = sourceNode.id;
    const existingEdge = edges.find(
      (e) => e.source === rowNodeId && e.target === colNodeId
    );
  
    // Get current values as stored in the row
    const row = rowData.find((r) => r.rowLabel?.trim() === rowLabel);
    if (!row) return;
    
    const rawI = type === "I" ? newValue : row[`${colNodeId}_I`];
    const rawC = type === "C" ? newValue : row[`${colNodeId}_C`];
    
  
    const isEmptyI = rawI === "" || rawI === null || rawI === undefined;
    const isEmptyC = rawC === "" || rawC === null || rawC === undefined;
  
    // 🧠 Edge should only be deleted if BOTH are empty
    let updatedEdges = [...edges];
  
    if (isEmptyI && isEmptyC) {
      updatedEdges = updatedEdges.filter(
        (e) => !(e.source === rowNodeId && e.target === colNodeId)
      );
    } else {
      const influence = isEmptyI ? 0 : parseInt(rawI, 10);
      const control = isEmptyC ? 0 : parseInt(rawC, 10);
  
      if (existingEdge) {
        updatedEdges = updatedEdges.map((e) =>
          e.source === rowNodeId && e.target === colNodeId
            ? {
                ...e,
                data: {
                  influence,
                  control,
                },
              }
            : e
        );
      } else {
        updatedEdges.push({
          id: `${rowNodeId}-${colNodeId}`,
          source: rowNodeId,
          target: colNodeId,
          data: {
            influence,
            control,
          },
        });
      }
    }
  
    setEdges(updatedEdges);
    localStorage.setItem("savedEdges", JSON.stringify(updatedEdges));
    window.dispatchEvent(new Event("storage-update"));
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
          stopEditingWhenCellsLoseFocus={true}
          singleClickEdit={true}
          defaultColDef={{ resizable: true, width: 80, editable: true }}
        />
      </div>
    </div>
  );
}
