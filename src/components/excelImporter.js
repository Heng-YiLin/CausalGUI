// utils/excelImporter.js
import * as XLSX from "xlsx";

export function parseExcelFile(file, setColumnDefs, setRowData, setNodes, setEdges) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let sheetData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      blankrows: false,
    });

    if (sheetData.length < 3) return;

    // === Fix: pad all rows to full column count ===
    const maxLength = Math.max(...sheetData.map((row) => row.length));
    sheetData = sheetData.map((row) => {
      const padded = [...row];
      while (padded.length < maxLength) padded.push("");
      return padded;
    });

    // === Parse headers ===
    const rawLabels = sheetData[0].slice(1);
    const rawTypes = sheetData[1].slice(1);
    const columnPairs = [];

    for (let i = 0; i < rawLabels.length; i++) {
      const label = rawLabels[i] || rawLabels[i - 1];
      const type = rawTypes[i];
      if (label && (type === "I" || type === "C")) {
        columnPairs.push({
          label,
          type,
          field: `${label}_${type}`,
        });
      }
    }

    const nodeIds = [...new Set(columnPairs.map((col) => col.label))];

    // === Create row data ===
    const newRows = sheetData.slice(2).map((row) => {
      const rowObj = { rowLabel: (row[0] || "").trim() };
      columnPairs.forEach((col, i) => {
        rowObj[col.field] = parseInt(row[i + 1]) || 0;
      });
      return rowObj;
    });

    // === Columns for ag-Grid ===
    const newColumnDefs = [
      { headerName: "", field: "rowLabel", pinned: "left", editable: true },
      ...nodeIds.map((label) => ({
        headerName: label,
        children: [
          { headerName: "I", field: `${label}_I`, editable: true },
          { headerName: "C", field: `${label}_C`, editable: true },
        ],
      })),
    ];

    // === Step 1: Create label-to-ID mapping ===
    const labelToIdMap = new Map();
    nodeIds.forEach((label, index) => {
      const id = (index + 1).toString();
      labelToIdMap.set(label, id);
    });

    // === Step 2: Build nodes using auto IDs with default positions ===
    const newNodes = nodeIds.map((label, index) => ({
      id: labelToIdMap.get(label),
      type: "custom",
      position: { x: 100 + index * 150, y: 100 }, // Spread nodes horizontally
      data: { label },
    }));

    const validNodeIds = new Set(newNodes.map((n) => n.id));

    // === Step 3: Build edges using the ID map and ensure all IDs exist ===
    const newEdges = [];

    newRows.forEach((row) => {
      const rowLabel = (row.rowLabel || "").trim();
      const sourceId = labelToIdMap.get(rowLabel);
      if (!sourceId || !validNodeIds.has(sourceId)) return;

      nodeIds.forEach((targetLabel) => {
        const targetId = labelToIdMap.get(targetLabel);
        if (!targetId || !validNodeIds.has(targetId)) return;

        const influence = parseInt(row[`${targetLabel}_I`]) || 0;
        const control = parseInt(row[`${targetLabel}_C`]) || 0;

        if ((influence || control) && sourceId !== targetId) {
          newEdges.push({
            id: `${sourceId}-${targetId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: sourceId,
            target: targetId,
            data: { influence, control, offset: 40 }, // Default offset
          });
        }
      });
    });

    // Finalize
    setColumnDefs(newColumnDefs);
    setRowData(newRows);
    setNodes(newNodes);
    setEdges(newEdges);

    localStorage.setItem("savedNodes", JSON.stringify(newNodes));
    localStorage.setItem("savedEdges", JSON.stringify(newEdges));
  };

  reader.readAsArrayBuffer(file);
}
