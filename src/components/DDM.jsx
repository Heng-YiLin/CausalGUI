import React, { useEffect, useState, useMemo, useCallback } from "react";
import "@xyflow/react/dist/style.css";
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

export default function DDMGrid() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

  useEffect(() => {
    const storedNodes = localStorage.getItem("savedNodes");
    const storedEdges = localStorage.getItem("savedEdges");

    let parsedNodes = [];
    let parsedEdges = [];

    if (storedNodes) {
      try {
        parsedNodes = JSON.parse(storedNodes);
        setNodes(parsedNodes);
      } catch (err) {
        console.error("Failed to parse nodes:", err);
      }
    }

    if (storedEdges) {
      try {
        parsedEdges = JSON.parse(storedEdges);
        setEdges(parsedEdges);
      } catch (err) {
        console.error("Failed to parse edges:", err);
      }
    }

    if (parsedNodes.length) {
      const cols = [
        { headerName: "", field: "rowLabel", pinned: 'left', editable: false }
      ];

      parsedNodes.forEach((node) => {
        cols.push(
          { headerName: `${node.data?.label || node.id} I`, field: `${node.id}_I`, editable: true },
          { headerName: `${node.data?.label || node.id} C`, field: `${node.id}_C`, editable: true }
        );
      });

      setColumnDefs(cols);

      const rows = parsedNodes.map((rowNode) => {
        const row = { rowLabel: rowNode.data?.label || rowNode.id };

        parsedNodes.forEach((colNode) => {
          const edge = parsedEdges.find(e => e.source === rowNode.id && e.target === colNode.id);
          row[`${colNode.id}_I`] = edge?.data?.influence ?? 0;
          row[`${colNode.id}_C`] = edge?.data?.control ?? 0;
        });

        return row;
      });

      setRowData(rows);
    }
  }, []);
  const handleCellChange = (params) => {
    const { data, colDef, newValue } = params;
    const [colNodeId, type] = colDef.field.split("_");
    const rowNode = nodes.find(n => (n.data?.label || n.id) === data.rowLabel);
    const rowNodeId = rowNode?.id;

    if (!rowNodeId || !colNodeId || isNaN(newValue)) return;

    const parsedValue = parseInt(newValue) || 0;

    const existingEdge = edges.find(
      (e) => e.source === rowNodeId && e.target === colNodeId
    );

    let updatedEdges = [...edges];

    if (!existingEdge && parsedValue > 0) {
      // Create new edge
      updatedEdges.push({
        id: `${rowNodeId}-${colNodeId}`,
        source: rowNodeId,
        target: colNodeId,
        data: {
          influence: type === "I" ? parsedValue : 0,
          control: type === "C" ? parsedValue : 0,
        },
      });
    } else if (existingEdge) {
      const newInfluence =
        type === "I" ? parsedValue : existingEdge.data.influence ?? 0;
      const newControl =
        type === "C" ? parsedValue : existingEdge.data.control ?? 0;

      if (newInfluence === 0 && newControl === 0) {
        // Remove edge
        updatedEdges = updatedEdges.filter(
          (e) => !(e.source === rowNodeId && e.target === colNodeId)
        );
      } else {
        // Update edge
        updatedEdges = updatedEdges.map((e) =>
          e.source === rowNodeId && e.target === colNodeId
            ? {
              ...e,
              data: {
                influence: newInfluence,
                control: newControl,
              },
            }
            : e
        );
      }
    }

    setEdges(updatedEdges);
    localStorage.setItem("savedEdges", JSON.stringify(updatedEdges));
  };

  return (
    <div style={{ padding: 20 }}>
      {nodes.length === 0 ? (
        <p>No nodes found in localStorage.</p>
      ) : (
        <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            onCellValueChanged={handleCellChange}
            stopEditingWhenCellsLoseFocus={true}
          />
        </div>
      )}
    </div>
  );
}
