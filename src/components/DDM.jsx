import React, { useEffect, useState, useRef } from "react";
import "@xyflow/react/dist/style.css";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { themeBalham } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {parseExcelFile} from "./excelImporter"

export default function DDMGrid() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);


  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      parseExcelFile(file, setColumnDefs, setRowData, setNodes, setEdges);
    }
  };




  // Initialize
  useEffect(() => {
    const storedNodes = JSON.parse(localStorage.getItem("savedNodes") || "[]");
    const storedEdges = JSON.parse(localStorage.getItem("savedEdges") || "[]");

    setNodes(storedNodes);
    setEdges(storedEdges);

    const columns = [
      {
        headerName: "",
        field: "rowLabel",
        pinned: "left",
        editable: true, // allow editing to add new node
      },
      ...storedNodes.map((node) => ({
        headerName: node.data?.label || node.id,
        children: [
          {
            headerName: "I",
            field: `${node.id}_I`,
            editable: true,
          },
          {
            headerName: "C",
            field: `${node.id}_C`,
            editable: true,
          },
        ],
      })),
    ];

    setColumnDefs(columns);

    const rows = storedNodes.map((rowNode) => {
      const row = { rowLabel: rowNode.data?.label || rowNode.id };
      storedNodes.forEach((colNode) => {
        const edge = storedEdges.find(
          (e) => e.source === rowNode.id && e.target === colNode.id
        );
        row[`${colNode.id}_I`] = edge?.data?.influence ?? 0;
        row[`${colNode.id}_C`] = edge?.data?.control ?? 0;
      });
      return row;
    });

    rows.push({ rowLabel: "" }); // Blank row for adding new node
    setRowData(rows);
  }, []);
  const getNextNodeId = () => {
    const savedNodes = JSON.parse(localStorage.getItem("savedNodes") || "[]");
    const maxId = savedNodes
      .map((n) => parseInt(n.id, 10))
      .filter((n) => !isNaN(n))
      .reduce((max, curr) => Math.max(max, curr), 0);
    return String(maxId + 1);
  };

  const handleCellChange = (params) => {
    const { data, colDef, newValue } = params;
    const [colNodeId, type] = colDef.field.split("_");
    const rowLabel = data.rowLabel?.trim();

    //Add new node when label typed in empty row
    if (
      !data._rowHandled &&
      rowLabel &&
      !nodes.some((n) => n.data?.label === rowLabel)
    ) {
      const newId = getNextNodeId();
      const newNode = {
        id: newId,
        type: "custom",
        position: { x: 0, y: 0 },
        data: { label: rowLabel },
      };

      const newNodes = [...nodes, newNode];
      localStorage.setItem("savedNodes", JSON.stringify(newNodes));
      setNodes(newNodes);

      // Reload to refresh headers and matrix
      window.location.reload();
      return;
    }

    // Don't continue if it's the header cell or invalid
    if (!colNodeId || isNaN(newValue)) return;
    const value = parseInt(newValue, 10);
    if (isNaN(value)) return;

    const sourceNode = nodes.find((n) => (n.data?.label || n.id) === rowLabel);
    if (!sourceNode) return;
    const rowNodeId = sourceNode.id;

    const existingEdge = edges.find(
      (e) => e.source === rowNodeId && e.target === colNodeId
    );
    let updatedEdges = [...edges];

    if (!existingEdge && value > 0) {
      // Create new edge
      updatedEdges.push({
        id: `${rowNodeId}-${colNodeId}`,
        source: rowNodeId,
        target: colNodeId,
        data: {
          influence: type === "I" ? value : 0,
          control: type === "C" ? value : 0,
        },
      });
    } else if (existingEdge) {
      const newInfluence =
        type === "I" ? value : existingEdge.data.influence ?? 0;
      const newControl = type === "C" ? value : existingEdge.data.control ?? 0;

      if (newInfluence === 0 && newControl === 0) {
        updatedEdges = updatedEdges.filter(
          (e) => !(e.source === rowNodeId && e.target === colNodeId)
        );
      } else {
        updatedEdges = updatedEdges.map((e) =>
          e.source === rowNodeId && e.target === colNodeId
            ? {
                ...e,
                data: { influence: newInfluence, control: newControl },
              }
            : e
        );
      }
    }

    localStorage.setItem("savedEdges", JSON.stringify(updatedEdges));
    setEdges(updatedEdges);
  };
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
