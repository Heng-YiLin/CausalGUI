import React, { useMemo, useState } from "react";

// --- Helpers to detect simple cycles (loops) from nodes & edges ---
function labelFor(id, nodes){
  const n = nodes?.find?.(x => x.id === id);
  const lbl = n?.data?.label ?? n?.label ?? id;
  // Quote if contains spaces or special chars
  return /[^A-Za-z0-9_\-/]/.test(lbl) ? `"${String(lbl)}"` : String(lbl);
}

function edgeBetween(a,b, edges){
  return edges?.find?.(e => e.source === a && e.target === b);
}

function edgePolarity(edge){
  // Try common shapes used in this project; fall back to undefined
  const d = edge?.data ?? {};
  if (d.polarity === '+' || d.polarity === 'plus' || d.polarity === 1) return '+';
  if (d.polarity === '-' || d.polarity === 'minus' || d.polarity === -1) return '-';
  // Infer from numeric impact if present
  if (typeof d.impact === 'number') {
    if (d.impact > 0) return '+';
    if (d.impact < 0) return '-';
  }
  return null; // unknown
}

function loopToStellaString(loopIds, nodes, edges){
  const parts = [];
  for(let i=0;i<loopIds.length;i++){
    const a = loopIds[i];
    const b = loopIds[(i+1)%loopIds.length];
    const edge = edgeBetween(a,b,edges);
    const pol = edgePolarity(edge);
    const arrow = pol ? `->(${pol})` : '->';
    parts.push(`${labelFor(a,nodes)} ${arrow}`);
  }
  return parts.join(' ') + ` ${labelFor(loopIds[0], nodes)}`; // close visually
}

// Canonical rotation to dedupe (direction preserved)
function canonicalRotate(ids){
  const n = ids.length;
  let best = null;
  for(let s=0; s<n; s++){
    const rot = ids.slice(s).concat(ids.slice(0,s));
    const key = rot.join('\u0001');
    if (best === null || key < best) best = key;
  }
  return best;
}

function findSimpleCycles(nodes, edges, maxLen=12, topK=1000){
  const adj = new Map(nodes.map(n => [n.id, []]));
  for(const e of edges){
    if (adj.has(e.source)) adj.get(e.source).push(e.target);
  }
  const foundKeys = new Set();
  const loops = [];

  function dfs(start, current, path, visited){
    if (path.length > maxLen) return;
    for(const nxt of adj.get(current) || []){
      if (nxt === start && path.length >= 2){
        // Found a loop: path + [start]
        const ids = [...path]; // simple cycle without repeating start at end
        const key = canonicalRotate(ids);
        if (!foundKeys.has(key)){
          foundKeys.add(key);
          loops.push(ids);
          if (loops.length >= topK) return; // soft cap
        }
      } else if (!visited.has(nxt)){
        visited.add(nxt);
        path.push(nxt);
        dfs(start, nxt, path, visited);
        path.pop();
        visited.delete(nxt);
      }
    }
  }

  for (const n of nodes){
    const start = n.id;
    const visited = new Set([start]);
    dfs(start, start, [start], visited);
    if (loops.length >= topK) break;
  }

  return loops;
}

function buildRowsFromGraph(nodes=[], edges=[], maxLen=12, pairwise=null, firstOrderIds=[]){
  if (!nodes.length || !edges.length) return [];
  const cycles = findSimpleCycles(nodes, edges, maxLen);
  const rows = cycles.map(ids => {
    let product = null;
    let pairwiseDetails = "";
    if (pairwise?.get) {
      product = 1;
      const details = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const a = ids[i];
        const b = ids[i + 1];
        const w = pairwise.get(a, b);
        const wVal = Number.isFinite(w) ? Math.round(w * 1000) / 1000 : null;
        if (wVal !== null) details.push(`${labelFor(a, nodes)}→${labelFor(b, nodes)}: ${wVal}`);
        product *= Number.isFinite(w) ? w : 1;
      }
      product = Math.round(product * 1000) / 1000;
      pairwiseDetails = details.join(", ");
    }
    // Compute Steering factor count (SFC)
    const sfc = Array.isArray(firstOrderIds) && firstOrderIds.length
      ? ids.reduce((acc, id) => acc + (firstOrderIds.includes(id) ? 1 : 0), 0)
      : 0;
    const totalFO = Array.isArray(firstOrderIds) ? firstOrderIds.length : 0;
    const nSFC = totalFO > 0 ? Math.round((sfc / totalFO) * 1000) / 1000 : null;
    const rawLoopCompositeValue = product;
    const aLCVl = Number.isFinite(rawLoopCompositeValue) && ids.length > 0
      ? Math.round(Math.pow(Math.abs(rawLoopCompositeValue), 1 / ids.length) * 1000) / 1000
      : null;
    return {
      stella: loopToStellaString(ids, nodes, edges),
      loopLength: ids.length,
      rawLoopCompositeValue,
      pairwiseDetails,
      aLCVl,
      nLCVl: null, // placeholder; we will fill after we know the max aLCVl
      SFC: sfc,
      nSFC,
      CIV: null,
    };
  });

  // Compute normalised loop composite value (nLCVl) relative to max aLCVl
  const maxA = rows.reduce((m, r) => (Number.isFinite(r.aLCVl) && r.aLCVl > m ? r.aLCVl : m), -Infinity);
  if (Number.isFinite(maxA) && maxA > 0) {
    for (const r of rows) {
      r.nLCVl = Number.isFinite(r.aLCVl) ? Math.round((r.aLCVl / maxA) * 1000) / 1000 : null;
    }
  }

  return rows;
}


const DEFAULT_ROWS = [
  {
    stella:
      'capacity_of_local_processing_infrastructure ->(+) "clean/sustainable_processing_alternatives" ->(-) environmental_impact ->(-) land_availability ->(-) diversification_of_farming_practices ->(+) primary_food_processing ->(+) "food_production_(productivity_factor)" ->(+) "units_of_food_produced_in_Wales_(volume)" ->(+) food_distribution ->(+) food_available ->(+) consumer_demand ->(+) JIT_processing',
    loopLength: 12,
    nLCVl: 1.0,
    SFC: 2,
    nSFC: 0.67,
    CIV: 0.26,
  },
  {
    stella:
      '"by-products_and_food_waste" ->(+) environmental_impact ->(-) land_availability ->(-) diversification_of_farming_practices ->(+) primary_food_processing ->(+) "food_production_(productivity_factor)" ->(+) "units_of_food_produced_in_Wales_(volume)" ->(+) food_distribution ->(+) food_available ->(+) consumer_demand ->(+) JIT_processing',
    loopLength: 11,
    nLCVl: 0.99,
    SFC: 2,
    nSFC: 0.67,
    CIV: 0.30,
  },
];



const fmt = (n) => (Number.isFinite(n) ? (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) : "");

/** @typedef {keyof LoopRow} SortKey */

export default function LOI({ rows = DEFAULT_ROWS, nodes = [], edges = [], maxLen = 12, pairwise = null }) {
  /** @type {[{key: SortKey, dir: 'asc'|'desc'}|null, Function]} */
  const [sort, setSort] = useState({ key: /** @type {SortKey} */("aLCVl"), dir: "desc" });
  const [query, setQuery] = useState("");

  // 1st order factor selection (local to LOI)
  const [firstOrder, setFirstOrder] = useState([]); // array of node ids

  // Build selectable options from current nodes
  const nodeOptions = useMemo(() => {
    const opts = nodes.map((n) => ({ id: n.id, label: labelFor(n.id, nodes) }));
    // sort by label for usability
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [nodes]);

  const addFirstOrder = () => {
    if (!nodeOptions.length) return;
    const existing = new Set(firstOrder);
    const nextOpt = nodeOptions.find((o) => !existing.has(o.id));
    if (!nextOpt) return; // all used, do nothing
    setFirstOrder((prev) => [...prev, nextOpt.id]);
  };

  const updateFirstOrder = (idx, id) => {
    setFirstOrder((prev) => {
      // prevent duplicates except allowing the current row to keep its value
      if (prev.some((v, i) => i !== idx && v === id)) return prev; // no-op
      return prev.map((v, i) => (i === idx ? id : v));
    });
  };

  const removeFirstOrder = (idx) => {
    setFirstOrder((prev) => prev.filter((_, i) => i !== idx));
  };

  const autoRows = useMemo(
    () => buildRowsFromGraph(nodes, edges, maxLen, pairwise, firstOrder),
    [nodes, edges, maxLen, pairwise, firstOrder]
  );
  const tableRows = autoRows.length ? autoRows : rows;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? tableRows.filter((r) => r.stella.toLowerCase().includes(q)) : tableRows;

    if (!sort) return base;

    const { key, dir } = sort;
    const copy = [...base];
    copy.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (typeof va === "number" && typeof vb === "number") {
        return dir === "asc" ? va - vb : vb - va;
      }
      return dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return copy;
  }, [tableRows, query, sort]);

  /** @param {SortKey} key */
  const requestSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  /** @param {SortKey} key */
  const sortIcon = (key) => {
    if (!sort || sort.key !== key) return "↕";
    return sort.dir === "asc" ? "↑" : "↓";
    };

  const copyStella = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Optional: toast could be used; keeping a simple alert for now.
      alert("STELLA string copied to clipboard");
    } catch (e) {
      console.warn("Clipboard write failed", e);
    }
  };

  // Basic utility styles (no external CSS required)
  const styles = {
    container: { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
    headerRow: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
    title: { fontSize: 18, fontWeight: 600 },
    search: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 10, width: 320, maxWidth: "100%" },
    tableWrap: { overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12 },
    table: { width: "100%", fontSize: 13, borderCollapse: "separate", borderSpacing: 0 },
    th: { position: "sticky", top: 0, background: "rgba(255,255,255,0.92)", backdropFilter: "saturate(180%) blur(4px)", textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" },
    thClickable: { cursor: "pointer", textDecoration: "none" },
    td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, lineHeight: 1.35, whiteSpace: "pre-wrap", minWidth: 640 },
    button: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", fontSize: 12, background: "white" },
    hint: { color: "#6b7280", fontSize: 12 },
  };

  const Th = ({ label, icon, onClick, minWidth }) => (
    <th
      style={{ ...styles.th, ...(onClick ? styles.thClickable : {}), ...(minWidth ? { minWidth } : {}) }}
      onClick={onClick}
      title={onClick ? `Sort by ${label}` : undefined}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{icon}</span>
      </span>
    </th>
  );

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Phase 1 – Loop Metrics</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search STELLA string..."
          style={styles.search}
        />
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th label="Loop" />
              <Th label="Loop length" />
              <Th label="Raw loop composite value" />
              <Th label="Adjusted Loop Composite Value (aLCVl)" />
              <Th label="Normalised loop composite value (nLCVl)" />
              <Th label="Steering factor count" />
              <Th label="Normalised steering factors (nSFCl)" />
              <Th label="Pairwise details" minWidth={400} />
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ ...styles.td, ...styles.mono }}>{r.stella}</td>
                <td style={styles.td}>{fmt(r.loopLength)}</td>
                <td style={styles.td}>{fmt(r.rawLoopCompositeValue)}</td>
                <td style={styles.td}>{fmt(r.aLCVl)}</td>
                <td style={styles.td}>{fmt(r.nLCVl)}</td>
                <td style={styles.td}>{fmt(r.SFC)}</td>
                <td style={styles.td}>{fmt(r.nSFC)}</td>
                <td style={{ ...styles.td, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
                  {r.pairwiseDetails || ""}
                </td>
                <td style={styles.td}>{fmt(r.CIV)}</td>
                <td style={styles.td}>
                  <button style={styles.button} onClick={() => copyStella(r.stella)} title="Copy STELLA string">Copy</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#6b7280" }}>
                  No rows match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1st order factor selection */}
      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>1st order factor selection</h2>
          <button
            onClick={addFirstOrder}
            disabled={firstOrder.length >= nodeOptions.length}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 12,
              background: "white",
              opacity: firstOrder.length >= nodeOptions.length ? 0.5 : 1,
              cursor: firstOrder.length >= nodeOptions.length ? "not-allowed" : "pointer",
            }}
          >
            + Add factor
          </button>
        </div>

        {firstOrder.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>No factors selected yet. Click <em>Add factor</em> to start.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {firstOrder.map((id, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 20, textAlign: "right", fontSize: 12 }}>{idx + 1}.</span>
                <select
                  value={id}
                  onChange={(e) => updateFirstOrder(idx, e.target.value)}
                  style={{ flex: 1, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8 }}
                >
                  {nodeOptions.map((opt) => {
                    const takenElsewhere = firstOrder.some((v, i2) => i2 !== idx && v === opt.id);
                    return (
                      <option key={opt.id} value={opt.id} disabled={takenElsewhere}>
                        {opt.label}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => removeFirstOrder(idx)}
                  title="Remove"
                  style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", fontSize: 12, background: "white" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {firstOrder.length >= nodeOptions.length && nodeOptions.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            All available factors have been selected.
          </div>
        )}
      </div>

      <div style={styles.hint}>
        <p style={{ margin: "8px 0 4px" }}>Tips</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Click a column header to sort (click again to reverse).</li>
          <li>Use the search box to filter by STELLA string contents.</li>
          <li>Numbers use fixed formatting for easier scanning.</li>
        </ul>
      </div>
    </div>
  );
}
