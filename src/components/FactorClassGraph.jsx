import React, { useMemo } from "react";
import "@xyflow/react/dist/style.css";
import FactorQuadChart from "./Graphs/FactorQuadChart";

// AG Grid (Theming API)
import { AgGridReact } from "ag-grid-react";
import { themeBalham } from "ag-grid-community";

/**
 * FactorClassGraph (Phase 1 – QSEM)
 *
 * Props:
 *  - nodes: array of nodes
 *  - impactWeight: number in [0,1] (global)
 *  - onChangeImpactWeight: (next:number) => void
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
  impactWeight = 0.5,
  onChangeImpactWeight = () => {},
}) {
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

  const columnDefs = useMemo(
    () => [
      { headerName: "ID", field: "alpha", width: 90, pinned: "left" },
      { headerName: "Node", field: "name", flex: 1, minWidth: 180 },
      {
        headerName: "Impact (AIV / PIV)",
        field: "impactKey",
        valueGetter: (p) => `${p.data.aiv ?? "—"}|${p.data.piv ?? "—"}`,
        cellRenderer: ImpactRenderer,
        flex: 1,
        minWidth: 220,
      },
      {
        headerName: "Control (ACV / PCV)",
        field: "controlKey",
        valueGetter: (p) => `${p.data.acv ?? "—"}|${p.data.pcv ?? "—"}`,
        cellRenderer: ControlRenderer,
        flex: 1,
        minWidth: 240,
      },
      {
        headerName: "Raw Weighted Active Value",
        field: "rawWeightedActiveValue",
        flex: 1,
        minWidth: 220,
        valueFormatter: (p) => (p.value == null ? "—" : p.value),
      },
      {
        headerName: "Raw Weighted Passive Value",
        field: "rawWeightedPassiveValue",
        flex: 1,
        minWidth: 220,
        valueFormatter: (p) => (p.value == null ? "—" : p.value),
      },
      {
        headerName: "Normalised Weighted Active Value",
        field: "normalisedWeightedActiveValue",
        flex: 1,
        minWidth: 260,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(3)),
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
        minWidth: 260,
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toFixed(3)),
        cellStyle: (p) => {
          const v = p.value;
          if (v == null) return null;
          const g = Math.round(255 * Math.max(0, Math.min(1, v)));
          return { backgroundColor: `rgba(0, ${g}, 0, 0.15)` };
        },
      },
    ],
    []
  );

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
          <p style={{ margin: 0 }}>
            <strong>Factor Class – Phase 1 (QSEM)</strong>
          </p>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 18,
            }}
          >
            <strong>Impact weight</strong>
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={impactWeight}
              onChange={(e) => {
                const next = Number(e.target.value);
                const clamped = Math.max(
                  0,
                  Math.min(1, Number.isFinite(next) ? next : 0)
                );
                onChangeImpactWeight(clamped);
              }}
              style={{ width: 88, minWidth: 88, flexShrink: 0, borderWidth: 1 ,borderRadius:5}}
            />
          </label>
        </div>
      </div>

      <div style={{ width: "100%", height: 300 }}>
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
        {/* Raw Values Chart */}
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: "center", marginBottom: 8 }}>
            Raw Weighted Values
          </h3>
          <FactorQuadChart
            nodes={coerceNodes}
            edges={coerceEdges}
            impactWeight={impactWeight}
          />
        </div>

        {/* Normalised Values Chart */}
        <div style={{ flex: 1 }}>
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
