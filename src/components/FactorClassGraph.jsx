import React, { useMemo, useState, useRef } from "react";
import "@xyflow/react/dist/style.css";
import FactorQuadChart from "./Graphs/FactorQuadChart";

// AG Grid (Theming API)
import { AgGridReact } from "ag-grid-react";
import { themeBalham } from "ag-grid-community";

// --- Export helpers ---
function downloadBlob(data, filename, type = "image/png") {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function elementToPNG(node, { filename = "factor-graph.png", scale = 2 } = {}) {
  if (!node) throw new Error("No node to export");

  // 1) Prefer <canvas>
  const canvas = node.querySelector("canvas");
  if (canvas && typeof canvas.toDataURL === "function") {
    const dataUrl = canvas.toDataURL("image/png");
    const bin = atob(dataUrl.split(",")[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    downloadBlob(arr, filename, "image/png");
    return;
  }

  // 2) If there is an <svg>, serialize and draw to a temp canvas
  const svg = node.querySelector("svg");
  if (svg) {
    const clone = svg.cloneNode(true);
    const bbox = svg.getBBox ? svg.getBBox() : { width: svg.clientWidth, height: svg.clientHeight };
    const w = Math.ceil(bbox.width || svg.clientWidth || 800);
    const h = Math.ceil(bbox.height || svg.clientHeight || 600);

    // Ensure xmlns so it renders correctly
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    const dataUrl = "data:image/svg+xml;base64," + svg64;

    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = (e) => rej(e);
      img.src = dataUrl;
    });

    const out = document.createElement("canvas");
    out.width = w * scale;
    out.height = h * scale;
    const ctx = out.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(img, 0, 0);

    const pngUrl = out.toDataURL("image/png");
    const bin = atob(pngUrl.split(",")[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    downloadBlob(arr, filename, "image/png");
    return;
  }

  // 3) Fallback: rasterize the container box via HTMLCanvas (very basic). If html2canvas is present, use it.
  if (window.html2canvas) {
    const c = await window.html2canvas(node, { scale });
    c.toBlob((blob) => downloadBlob(blob, filename, "image/png"));
    return;
  }
  throw new Error("Could not find a canvas or svg to export");
}

/**
 * FactorClassGraph (Phase 1 – QSEM)
 *
 * Props:
 *  - nodes: array of nodes
 *
 * Renders:
 *  1) Alphabet label A..Z, AA.. etc
 *  2) Node name
 *  3) Impact (AIV / PIV)
 *  4) Control (ACV / PCV)
 *  5) Raw Weighted Active Value
 *  6) Raw Weighted Passive Value
 */
export default function FactorClassGraph({
  nodes: propNodes = [],
  edges: propEdges = [],
}) {
  const [impactWeight, setImpactWeight] = useState(0.2);
  const [showRawWeighted, setShowRawWeighted] = useState(true);

  const graphWrapRef = useRef(null);

  // A -> Z, AA, AB, ...
  const alphaLabel = (index) => {
    let n = index + 1;
    let label = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return label;
  };

  const coerceNodes = useMemo(() => {
    if (propNodes?.length) return propNodes;
    try {
      const saved = JSON.parse(localStorage.getItem("savedNodes") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }, [propNodes]);

  const coerceEdges = useMemo(() => {
    if (propEdges?.length) return propEdges;
    try {
      const saved = JSON.parse(localStorage.getItem("savedEdges") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }, [propEdges]);

  const toNum = (x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };

  const computeActiveMetrics = (nodes = [], edges = [], weight = 0.5) => {
    const w = toNum(weight);
    const byId = new Map(
      nodes.map((n) => [
        n.id,
        {
          aiv: 0,
          piv: 0,
          acv: 0,
          pcv: 0,
          impactWeight: w,
          rawWeightedActiveValue: 0,
          rawWeightedPassiveValue: 0,
        },
      ])
    );

    for (const e of edges) {
      const impact = Math.abs(toNum(e?.data?.impact));
      const control = Math.abs(toNum(e?.data?.control));
      const src = byId.get(e.source);
      const tgt = byId.get(e.target);
      if (src) {
        src.aiv += impact;
        src.acv += control;
      }
      if (tgt) {
        tgt.piv += impact;
        tgt.pcv += control;
      }
    }

    for (const [, m] of byId.entries()) {
      m.rawWeightedActiveValue =
        m.impactWeight * m.aiv + (1 - m.impactWeight) * m.acv;
      m.rawWeightedPassiveValue =
        m.impactWeight * m.piv + (1 - m.impactWeight) * m.pcv;
    }
    return byId;
  };

  const metricsById = useMemo(
    () => computeActiveMetrics(coerceNodes, coerceEdges, impactWeight),
    [coerceNodes, coerceEdges, impactWeight]
  );

  const ranges = useMemo(() => {
    let actVals = [];
    let pasVals = [];
    for (const n of coerceNodes || []) {
      const m = metricsById.get(n.id);
      const a = m?.rawWeightedActiveValue;
      const p = m?.rawWeightedPassiveValue;
      if (Number.isFinite(a)) actVals.push(a);
      if (Number.isFinite(p)) pasVals.push(p);
    }
    const minAct = actVals.length ? Math.min(...actVals) : 0;
    const maxAct = actVals.length ? Math.max(...actVals) : 0;
    const minPas = pasVals.length ? Math.min(...pasVals) : 0;
    const maxPas = pasVals.length ? Math.max(...pasVals) : 0;
    return { minAct, maxAct, minPas, maxPas };
  }, [coerceNodes, metricsById]);

  const rowData = useMemo(() => {
    return (coerceNodes || []).map((n, i) => {
      const name = n?.data?.label ?? n?.label ?? `Node ${n?.id ?? i + 1}`;
      const m = metricsById.get(n.id) || {};
      const aiv = m.aiv ?? null;
      const piv = m.piv ?? null;
      const acv = m.acv ?? null;
      const pcv = m.pcv ?? null;

      const rawWeightedActiveValue = m.rawWeightedActiveValue ?? null;
      const rawWeightedPassiveValue = m.rawWeightedPassiveValue ?? null;

      const norm = (v, min, max) =>
        Number.isFinite(v) && max > min
          ? ((v - min) / (max - min)) * 100
          : Number.isFinite(v)
          ? 100
          : null;

      const normalisedWeightedActiveValue = norm(
        rawWeightedActiveValue,
        ranges.minAct,
        ranges.maxAct
      );
      const normalisedWeightedPassiveValue = norm(
        rawWeightedPassiveValue,
        ranges.minPas,
        ranges.maxPas
      );

      return {
        alpha: alphaLabel(i),
        name,
        aiv,
        piv,
        acv,
        pcv,
        id: n.id,
        rawWeightedActiveValue,
        rawWeightedPassiveValue,
        normalisedWeightedActiveValue,
        normalisedWeightedPassiveValue,
      };
    });
  }, [coerceNodes, metricsById, ranges]);

  const ImpactRenderer = (props) => {
    const a = props?.data?.aiv ?? "—";
    const p = props?.data?.piv ?? "—";
    return (
      <div style={{ display: "flex", gap: 12 }}>
        <span>
          <strong>AIV</strong>: {a}
        </span>
        <span>
          <strong>PIV</strong>: {p}
        </span>
      </div>
    );
  };

  const ControlRenderer = (props) => {
    const a = props?.data?.acv ?? "—";
    const p = props?.data?.pcv ?? "—";
    return (
      <div style={{ display: "flex", gap: 12 }}>
        <span>
          <strong>ACV</strong>: {a}
        </span>
        <span>
          <strong>PCV</strong>: {p}
        </span>
      </div>
    );
  };

  const columnDefs = useMemo(() => {
    const baseCols = [
      { headerName: "ID", field: "alpha", width: 45, pinned: "left" },
      { headerName: "Node", field: "name", flex: 1, width: 25 },
      {
        headerName: "Impact",
        field: "impactKey",
        valueGetter: (p) => `${p.data.aiv ?? "—"}|${p.data.piv ?? "—"}`,
        cellRenderer: ImpactRenderer,
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: "Control",
        field: "controlKey",
        valueGetter: (p) => `${p.data.acv ?? "—"}|${p.data.pcv ?? "—"}`,
        cellRenderer: ControlRenderer,
        flex: 1,
        minWidth: 100,
      },
    ];

    const rawCols = [
      {
        headerName: "Raw Weighted Active Value",
        field: "rawWeightedActiveValue",
        flex: 1,
        minWidth: 120,
        wrapHeaderText: true,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(1)),
      },
      {
        headerName: "Raw Weighted Passive Value",
        field: "rawWeightedPassiveValue",
        flex: 1,
        minWidth: 120,
        wrapHeaderText: true,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(1)),
      },
    ];

    const normCols = [
      {
        headerName: "Normalised Weighted Active Value",
        field: "normalisedWeightedActiveValue",
        flex: 1,
        minWidth: 120,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(1)),
        cellStyle: (p) => {
          const v = p.value;
          if (v == null) return null;
          const g = Math.round(255 * Math.max(0, Math.min(1, v)));
          return { backgroundColor: `rgba(0, ${g}, 0, 0.15)` };
        },
      },
      {
        headerName: "Normalised Weighted Passive Value",
        field: "normalisedWeightedPassiveValue",
        flex: 1,
        minWidth: 120,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(1)),
        cellStyle: (p) => {
          const v = p.value;
          if (v == null) return null;
          const g = Math.round(255 * Math.max(0, Math.min(1, v)));
          return { backgroundColor: `rgba(0, ${g}, 0, 0.15)` };
        },
      },
    ];

    return showRawWeighted ? [...baseCols, ...rawCols, ...normCols] : [...baseCols, ...normCols];
  }, [showRawWeighted]);

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 18,
            }}
          >
            <strong>Impact weight [System Factor Classification]</strong>
            <input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={impactWeight}
              onChange={(e) => {
                const next = Number(e.target.value);
                const clamped = Math.max(
                  0,
                  Math.min(1, Number.isFinite(next) ? next : 0)
                );
                setImpactWeight(clamped);
              }}
              style={{
                width: 72,
                marginLeft: 6,
                padding: "4px 6px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
              }}
            />
          </label>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={async () => {
            try {
              const ts = new Date();
              const pad = (n) => String(n).padStart(2, "0");
              const fname = `FactorGraph_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.png`;
              await elementToPNG(graphWrapRef.current, { filename: fname, scale: 2 });
            } catch (e) {
              console.error(e);
              alert(e?.message || "Failed to export factor graph as image.");
            }
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Export Factor Graph (PNG)
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={showRawWeighted}
            onChange={(e) => setShowRawWeighted(e.target.checked)}
          />
          Show Raw Weighted Values
        </label>
      </div>

      <div style={{ width: "92%", height: 300, margin: "0 auto" }}>
        <AgGridReact
          theme={themeBalham}
          getRowId={(params) => params.data.alpha}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          suppressFieldDotNotation={true}
        />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
        {/* Normalised Values Chart */}
        <div ref={graphWrapRef} style={{ flex: 1, margin: "0 auto", width: "80%", background: "#fff" }}>
          <h3 style={{ textAlign: "center", marginBottom: 8 }}>
            Normalised Weighted Values
          </h3>
          <FactorQuadChart
            nodes={coerceNodes}
            edges={coerceEdges}
            impactWeight={impactWeight}
            useNormalised={true}
          />
        </div>
      </div>
    </div>
  );
}
