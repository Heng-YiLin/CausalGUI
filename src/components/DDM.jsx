import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import "@xyflow/react/dist/style.css";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { themeBalham } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { parseExcelFile } from "./excelImporter";

export default function DDMGrid({
  nodes,
  edges,
  setNodes,
  setEdges,
  impactWeight,
  setImpactWeight,
}) {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const gridRef = useRef(null);
  const gridApiRef = useRef(null);
  const gridColumnApiRef = useRef(null);
  // Inject visible grid borders and compact I/C header style
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-ddm-borders", "true");
    style.textContent = `
      /* Visible gridlines for cells and headers */
      .ag-root-wrapper .ag-cell,
      .ag-root-wrapper .ag-header-cell,
      .ag-root-wrapper .ag-header-group-cell {
        border-right: 1px solid #c9c9c9;
        border-bottom: 1px solid #c9c9c9;
      }
      .ag-root-wrapper {
        border: 1px solid #9a9a9a;
      }
      /* Compact I/C header text */
      .ag-header-cell.small-subheader .ag-header-cell-label,
      .small-subheader .ag-header-cell-label {
        padding: 0 2px;
      }
      .ag-header-cell.small-subheader .ag-header-cell-text,
      .small-subheader .ag-header-cell-text {
        font-size: 11px;
        line-height: 1.1;
      }
        
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);
  // Weight parameter alpha comes from App (impactWeight)
  const alphaRef = useRef(impactWeight);
  useEffect(() => {
    alphaRef.current = impactWeight;
  }, [impactWeight]);

  useEffect(() => {
    const api = gridApiRef.current;
    if (api) {
      api.refreshCells({ force: true });
      api.redrawRows();
    }
  }, [impactWeight]);
  // Load persisted impact weight on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ddmImpactWeight");
      if (saved !== null) {
        const v = Number(saved);
        if (Number.isFinite(v)) {
          const clamped = Math.min(1, Math.max(0, v));
          setImpactWeight?.(clamped);
        }
      }
    } catch (_) {}
  }, []);

  
// Persist impact weight whenever it changes + broadcast for same-tab listeners
useEffect(() => {
  try {
    if (Number.isFinite(Number(impactWeight))) {
      localStorage.setItem("ddmImpactWeight", String(impactWeight));
    }
  } catch (_) {}
}, [impactWeight]);

  const refreshTotals = (api) => api?.refreshCells({ force: true });
  // Excel Import
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      parseExcelFile(file, setColumnDefs, setRowData, setNodes, setEdges);
    }
  };
  const getRowHeight = useCallback(() => {
    return undefined; // uniform height for all rows
  }, []);

  // map numbers to green shades; null/undefined/0 => white
  const valueToGreen = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "#ffffff";
    if (n === 1) return "#a6f7cdff"; // light
    if (n === 2) return "#5bc483ff"; // mid
    return "#34d399"; // dark (3+)
  };

  // Pairwise weight from I and C, using explicit alpha
  const pairwiseW = (i, c, a) => {
    const I = Number.isFinite(Number(i)) ? Number(i) : 0;
    const C = Number.isFinite(Number(c)) ? Number(c) : 0;
    const A = Number.isFinite(Number(a)) ? Number(a) : 0;
    return A * I + (1 - A) * C;
  };

  const colorizeW = (p) => {
    // Don't color totals rows (now marked by _pin)
    if (p.data?._pin) return null;

    // Grey-out diagonal (same source & target node)
    const [colNodeId] = (p.colDef.field || "").split("_");
    if (p.data && p.data._rowNodeId === colNodeId) {
      return {
        backgroundColor: "#888888ff",
        color: "#3b3b3bff",
        pointerEvents: "none",
        textAlign: "center",
      };
    }

    // Otherwise color by pairwise weight
    const w = pairwiseW(
      p.data?.[`${colNodeId}_I`],
      p.data?.[`${colNodeId}_C`],
      alphaRef.current
    );
    const bg = valueToGreen(w);
    const color = bg === "#34d399" ? "#063e2b" : "#111827";
    return { backgroundColor: bg, color, textAlign: "center" };
  };

  // shared cellStyle for I/C
  const colorizeIC = (p) => {
    const [colNodeId] = (p.colDef.field || "").split("_");
    // keep diagonal grey & disabled (only on normal rows)
    if (p.data && p.data._rowNodeId === colNodeId && !p.data?._pin) {
      return {
        backgroundColor: "#888888ff",
        color: "#3b3b3bff",
        pointerEvents: "none",
      };
    }

    // don't color totals rows (now marked by _pin)
    if (p.data?._pin) return null;

    const bg = valueToGreen(p.value);
    // darker shade = darker text for contrast
    const color = bg === "#34d399" ? "#063e2b" : "#111827";
    return { backgroundColor: bg, color, textAlign: "center" };
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
        headerName: "Impact of ↓ on →",
        field: "rowLabel",
        pinned: "left",
        suppressMovable: true,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        wrapText: true, // allow wrapping (we'll only enable it on pinned rows)
        autoHeight: true, // let the row grow if it wraps
        cellStyle: (p) =>
          p.data?._pin
            ? { whiteSpace: "normal", lineHeight: 1.2, paddingBottom: 2 }
            : { whiteSpace: "nowrap" },
      },
      // All node groups first
      ...nodeList.map((node) => ({
        headerName: node.data?.label || node.id,
        children: [
          {
            headerName: "I",
            headerClass: "small-subheader",
            field: `${node.id}_I`,
            width: 36,
            minWidth: 30,
            maxWidth: 42,
            editable: false,
            valueSetter: numericValueSetter,
            valueGetter: (p) => {
              if (p.data?._pin === "I") {
                let sum = 0;
                p.api.forEachLeafNode((n) => {
                  const rd = n.data;
                  if (!rd || !rd._rowNodeId || rd._pin) return; // skip totals rows
                  const num = Number(rd[`${node.id}_I`]);
                  if (Number.isFinite(num)) sum += num;
                });
                return sum;
              }
              return p.data ? p.data[`${node.id}_I`] : null;
            },
            valueFormatter: blankNullFormatter,
            cellClass: "cycle-cell",
            cellStyle: colorizeIC,
            tooltipValueGetter: () =>
              "Click to cycle through values: null → 1 → 2 → 3",
          },
          {
            headerName: "C",
            headerClass: "small-subheader",
            field: `${node.id}_C`,
            width: 36,
            minWidth: 30,
            maxWidth: 42,
            editable: false,
            cellClass: "cycle-cell",
            valueSetter: numericValueSetter,
            valueGetter: (p) => {
              if (p.data?._pin === "C") {
                let sum = 0;
                p.api.forEachLeafNode((n) => {
                  const rd = n.data;
                  if (!rd || !rd._rowNodeId || rd._pin) return; // skip totals rows
                  const num = Number(rd[`${node.id}_C`]);
                  if (Number.isFinite(num)) sum += num;
                });
                return sum;
              }
              return p.data ? p.data[`${node.id}_C`] : null;
            },
            valueFormatter: blankNullFormatter,
            cellStyle: colorizeIC,
            tooltipValueGetter: () =>
              "Click to cycle through values: null → 0 → 1 → 2 → 3",
          },
          {
            headerName: "W",
            field: `${node.id}_W`,
            headerClass: "small-subheader",
            width: 50,
            minWidth: 30,
            maxWidth: 42,
            editable: false,
            valueGetter: (p) => {
              if (p.data?._pin) return ""; // no totals for W rows
              // Blank out diagonal (same-node pair)
              if (p.data?._rowNodeId === node.id) return "";
              const iVal = p.data ? p.data[`${node.id}_I`] : null;
              const cVal = p.data ? p.data[`${node.id}_C`] : null;
              const w = pairwiseW(iVal, cVal, alphaRef.current);
              return Number.isFinite(w) ? Number(w.toFixed(3)) : "";
            },
            valueFormatter: (p) =>
              p.value === null || p.value === undefined || p.value === ""
                ? ""
                : String(p.value),
            cellStyle: colorizeW,
            tooltipValueGetter: (p) => {
              if (p.data?._rowNodeId === node.id) {
                return "No pairwise weight on the diagonal (same node).";
              }
              const a = Number(alphaRef.current ?? 0);
              return `Pairwise weight W = ${a.toFixed(2)}·I + ${(1 - a).toFixed(
                2
              )}·C`;
            },
          },
        ],
      })),
      // ▼ Summary columns at the very end and non-movable
      {
        headerName: "Active Impact Value (AIVi)",
        wrapHeaderText: true,
        autoHeaderHeight: true,
        field: "_sumAI",
        editable: false,
        sortable: false,

        width: 100,
        suppressMovable: true,
        valueGetter: (p) => {
          if (!p.data || !p.data._rowNodeId) return "";
          let sum = 0;
          for (const k in p.data) {
            if (k.endsWith("_I")) {
              const v = p.data[k];
              if (typeof v === "number" && Number.isFinite(v)) sum += v;
            }
          }
          return sum;
        },
      },
      {
        headerName: "Active Control Value (AIVi)",
        wrapHeaderText: true,
        autoHeaderHeight: true,
        field: "_sumAC",
        editable: false,
        width: 120,
        sortable: false,

        suppressMovable: true,
        valueGetter: (p) => {
          if (!p.data || !p.data._rowNodeId) return "";
          let sum = 0;
          for (const k in p.data) {
            if (k.endsWith("_C")) {
              const v = p.data[k];
              if (typeof v === "number" && Number.isFinite(v)) sum += v;
            }
          }
          return sum;
        },
      },
    ];

    const rows = nodeList.map((rowNode) => {
      const row = {
        rowLabel: rowNode.data?.label || rowNode.id,
        _rowNodeId: rowNode.id,
      };

      nodeList.forEach((colNode) => {
        const edge = edgeList.find(
          (e) => e.source === rowNode.id && e.target === colNode.id
        );
        row[`${colNode.id}_I`] = edge?.data?.impact ?? null;
        row[`${colNode.id}_C`] = edge?.data?.control ?? null;
      });
      return row;
    });
    // append totals as regular rows at the bottom
    rows.push({ rowLabel: "Passive Impact Value (PIVi)", _pin: "I" });
    rows.push({ rowLabel: "Passive Control Value (PCVi)", _pin: "C" });

    setColumnDefs(columns);
    setRowData(rows);
  };

  const postSortRows = useCallback((params) => {
    const nodes = params.nodes;
    if (!nodes || nodes.length === 0) return;

    // Stable partition: keep normal rows first, push _pin rows to the end
    const normal = [];
    const totals = [];
    for (const n of nodes) {
      if (n?.data?._pin) totals.push(n);
      else normal.push(n);
    }
    nodes.length = 0;
    nodes.push(...normal, ...totals);
  }, []);
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
    refreshTotals(params.api); // recompute pinned sums now
  };

  const handleCellClick = (params) => {
    const field = params.colDef?.field;
    if (!field) return;
    const parts = field.split("_");
    const suffix = parts[1];
    if (suffix !== "I" && suffix !== "C") return; // only cycle on I/C columns
    const [colNodeId] = parts;
    if (params.data?._rowNodeId === colNodeId) return;

    const current = params.data[field] ?? null;
    const next = nextCycleValue(suffix, current);
    params.node.setDataValue(field, next); // triggers handleCellChange
    refreshTotals(params.api); // recompute pinned sums now
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

  // Ensure summary columns are always at the end (component-scoped)
  const ensureSummaryAtEnd = useCallback(() => {
    const colApi = gridColumnApiRef.current;
    if (!colApi) return;

    const allCols = colApi.getAllGridColumns();
    if (!allCols || allCols.length === 0) return;

    const sumKeys = ["_sumAI", "_sumAC"]; // last two
    const allIds = allCols.map((c) => c.getColId());
    const others = allIds.filter((id) => !sumKeys.includes(id));

    const ordered = [...others, ...sumKeys];
    const state = ordered.map((colId, order) => ({ colId, order }));

    try {
      colApi.applyColumnState({ state, applyOrder: true });
    } catch (_) {}
  }, []);

  return (
    <div style={{ padding: 10 }}>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} /> */}
        <label
          style={{
            fontSize: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Impact weight [Loops of Interest(LOI)]
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={Number(impactWeight).toFixed(2)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              const clamped = Math.min(1, Math.max(0, v));
              setImpactWeight?.(clamped);
            }}
            style={{
              width: 70,
              padding: "4px 6px",
              outline: "1px solid #919191ff",
              borderRadius: 8,
            }}
          />
        </label>
      </div>
      <div style={{ height: `calc(100vh - 190px)`, width: "100%" }}>
        <AgGridReact
          theme={themeBalham}
          domLayout="normal"
          rowData={rowData}
          postSortRows={postSortRows}
          ref={gridRef}
          columnDefs={columnDefs}
          getRowHeight={getRowHeight}
          rowHeight={25}
          headerHeight={25}
          onCellValueChanged={handleCellChange}
          onCellClicked={handleCellClick}
          stopEditingWhenCellsLoseFocus={true}
          singleClickEdit={false}
          defaultColDef={{ resizable: true, width: 90, editable: true }}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            gridColumnApiRef.current = params.columnApi;
            setTimeout(ensureSummaryAtEnd, 0);
          }}
          onColumnMoved={ensureSummaryAtEnd}
          onColumnVisible={ensureSummaryAtEnd}
          onDisplayedColumnsChanged={ensureSummaryAtEnd}
        />
      </div>
    </div>
  );
}
