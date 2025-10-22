import React, { useMemo, useState, useEffect } from "react";

// --- Helpers to detect simple cycles (loops) from nodes & edges ---
function labelFor(id, nodes) {
  const n = nodes?.find?.((x) => x.id === id);
  const lbl = n?.data?.label ?? n?.label ?? id;
  // Quote if contains spaces or special chars
  return /[^A-Za-z0-9_\-/]/.test(lbl) ? `"${String(lbl)}"` : String(lbl);
}

function edgeBetween(a, b, edges) {
  return edges?.find?.((e) => e.source === a && e.target === b);
}

function edgePolarity(edge) {
  // Try common shapes used in this project; fall back to undefined
  const d = edge?.data ?? {};
  if (d.polarity === "+" || d.polarity === "plus" || d.polarity === 1)
    return "+";
  if (d.polarity === "-" || d.polarity === "minus" || d.polarity === -1)
    return "-";
  // Infer from numeric impact if present
  if (typeof d.impact === "number") {
    if (d.impact > 0) return "+";
    if (d.impact < 0) return "-";
  }
  return null; 
}

function loopToStellaString(loopIds, nodes, edges) {
  const parts = [];
  for (let i = 0; i < loopIds.length; i++) {
    const a = loopIds[i];
    const b = loopIds[(i + 1) % loopIds.length];
    const edge = edgeBetween(a, b, edges);
    const pol = edgePolarity(edge);
    const arrow = pol ? `->(${pol})` : "->";
    parts.push(`${labelFor(a, nodes)} ${arrow}`);
  }
  return parts.join(" ") + ` ${labelFor(loopIds[0], nodes)}`; // close visually
}

// Canonical rotation to dedupe (direction preserved)
function canonicalRotate(ids) {
  const n = ids.length;
  let best = null;
  for (let s = 0; s < n; s++) {
    const rot = ids.slice(s).concat(ids.slice(0, s));
    const key = rot.join("\u0001");
    if (best === null || key < best) best = key;
  }
  return best;
}

function findSimpleCycles(nodes, edges, maxLen = 12, topK = 1000) {
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (adj.has(e.source)) adj.get(e.source).push(e.target);
  }
  const foundKeys = new Set();
  const loops = [];

  function dfs(start, current, path, visited) {
    if (path.length > maxLen) return;
    for (const nxt of adj.get(current) || []) {
      if (nxt === start && path.length >= 2) {
        // Found a loop: path + [start]
        const ids = [...path]; // simple cycle without repeating start at end
        const key = canonicalRotate(ids);
        if (!foundKeys.has(key)) {
          foundKeys.add(key);
          loops.push(ids);
          if (loops.length >= topK) return; // soft cap
        }
      } else if (!visited.has(nxt)) {
        visited.add(nxt);
        path.push(nxt);
        dfs(start, nxt, path, visited);
        path.pop();
        visited.delete(nxt);
      }
    }
  }

  for (const n of nodes) {
    const start = n.id;
    const visited = new Set([start]);
    dfs(start, start, [start], visited);
    if (loops.length >= topK) break;
  }

  return loops;
}

function buildRowsFromGraph(
  nodes = [],
  edges = [],
  maxLen = 12,
  pairwise = null,
  firstOrderIds = [],
  freqMap = null,
  useAdjustedIndependence = false,
  composite = 1,
  coeffSFC = 1,
  coeffCIV = 1
) {
  if (!nodes.length || !edges.length) return [];
  const cycles = findSimpleCycles(nodes, edges, maxLen);
  const rows = cycles.map((ids) => {
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
        if (wVal !== null)
          details.push(`${labelFor(a, nodes)}→${labelFor(b, nodes)}: ${wVal}`);
        product *= Number.isFinite(w) ? w : 1;
      }
      product = Math.round(product * 1000) / 1000;
      pairwiseDetails = details.join(", ");
    }
    // Compute Steering factor count (SFC)
    const sfc =
      Array.isArray(firstOrderIds) && firstOrderIds.length
        ? ids.reduce((acc, id) => acc + (firstOrderIds.includes(id) ? 1 : 0), 0)
        : 0;
    const totalFO = Array.isArray(firstOrderIds) ? firstOrderIds.length : 0;
    const nSFC = totalFO > 0 ? Math.round((sfc / totalFO) * 1000) / 1000 : null;
    const rawLoopCompositeValue = product;
    const aLCVl =
      Number.isFinite(rawLoopCompositeValue) && ids.length > 0
        ? Math.round(
            Math.pow(Math.abs(rawLoopCompositeValue), 1 / ids.length) * 1000
          ) / 1000
        : null;
    const totalOverlap = freqMap
      ? ids.reduce((sum, id) => sum + (freqMap.get(id) || 0), 0)
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
      totalOverlap,
    };
  });

  // Compute normalised loop composite value (nLCVl) relative to max aLCVl
  const maxA = rows.reduce(
    (m, r) => (Number.isFinite(r.aLCVl) && r.aLCVl > m ? r.aLCVl : m),
    -Infinity
  );
  if (Number.isFinite(maxA) && maxA > 0) {
    for (const r of rows) {
      r.nLCVl = Number.isFinite(r.aLCVl)
        ? Math.round((r.aLCVl / maxA) * 1000) / 1000
        : null;
    }
  }

  // Compute normalised independent loop value based on totalOverlap
  const maxOverlap = rows.reduce(
    (m, r) =>
      Number.isFinite(r.totalOverlap) && r.totalOverlap > m
        ? r.totalOverlap
        : m,
    -Infinity
  );
  if (Number.isFinite(maxOverlap) && maxOverlap > 0) {
    for (const r of rows) {
      r.normalisedIndependentLoopValue = Number.isFinite(r.totalOverlap)
        ? Math.round((r.totalOverlap / maxOverlap) * 1000) / 1000
        : null;
      r.adjustedIndependentLoopValue = Number.isFinite(
        r.normalisedIndependentLoopValue
      )
        ? Math.round(r.loopLength * r.normalisedIndependentLoopValue * 1000) /
          1000
        : null;
    }
  } else {
    for (const r of rows) {
      r.normalisedIndependentLoopValue = null;
      r.adjustedIndependentLoopValue = null;
    }
  }

  // Compute normalised adjusted independent loop value
  const maxAdjInd = rows.reduce(
    (m, r) =>
      Number.isFinite(r.adjustedIndependentLoopValue) &&
      r.adjustedIndependentLoopValue > m
        ? r.adjustedIndependentLoopValue
        : m,
    -Infinity
  );
  if (Number.isFinite(maxAdjInd) && maxAdjInd > 0) {
    for (const r of rows) {
      r.normalisedAdjustedIndependentLoopValue = Number.isFinite(
        r.adjustedIndependentLoopValue
      )
        ? Math.round((r.adjustedIndependentLoopValue / maxAdjInd) * 1000) / 1000
        : null;
    }
  } else {
    for (const r of rows) {
      r.normalisedAdjustedIndependentLoopValue = null;
    }
  }

  // Compute CIV per row based on the toggle (use adjusted vs normalised independent value)
  for (const r of rows) {
    const civSource = useAdjustedIndependence
      ? r.normalisedAdjustedIndependentLoopValue
      : r.normalisedIndependentLoopValue;
    r.CIV = Number.isFinite(civSource) ? civSource : null;
  }

  // Compute weighted loop value: ((nLCVl*composite) + (nSFC*coeffSFC) + (CIV*coeffCIV)) * 100
  for (const r of rows) {
    const nLCV = Number.isFinite(r.nLCVl) ? r.nLCVl : 0;
    const nS = Number.isFinite(r.nSFC) ? r.nSFC : 0;
    const civ = Number.isFinite(r.CIV) ? r.CIV : 0;
    r.weightedLoopValue =
      Math.round(
        (nLCV * composite + nS * coeffSFC + civ * coeffCIV) * 100 * 1000
      ) / 1000;
  }

  // Compute normalised weighted loop value (nWLV) relative to max weightedLoopValue
  const maxWeighted = rows.reduce(
    (m, r) =>
      Number.isFinite(r.weightedLoopValue) && r.weightedLoopValue > m
        ? r.weightedLoopValue
        : m,
    -Infinity
  );
  if (Number.isFinite(maxWeighted) && maxWeighted > 0) {
    for (const r of rows) {
      r.nWLV = Number.isFinite(r.weightedLoopValue)
        ? (Math.round((r.weightedLoopValue / maxWeighted) * 1000) / 1000) * 100
        : null;
    }
  } else {
    for (const r of rows) {
      r.nWLV = null;
    }
  }

  return rows;
}

const DEFAULT_ROWS = [
  {
    stella:
      'no loop found',
    loopLength: 0,
    composite: 0,
    SFC: 0,
    nSFC: 0,
    CIV: 0,
  }
];

const fmt = (n) =>
  Number.isFinite(n) ? (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) : "";

function greenBoxStyle(v) {
  if (!Number.isFinite(v)) return {};
  // nWLV is 0..100; map to 0..1
  const t = Math.max(0, Math.min(100, v)) / 100;
  // Background from very light green (near 0) to deeper green (near 100)
  const lightness = 96 - t * 60; // 96% -> 36%
  const background = `hsl(140, 70%, ${lightness}%)`;
  // Choose text color for readability on darker greens
  const textColor = "#111111";
  return {
    background,
    color: textColor,
    fontWeight: 600,
  };
}

/** @typedef {keyof LoopRow} SortKey */

export default function LOI({
  rows = DEFAULT_ROWS,
  nodes = [],
  edges = [],
  maxLen = 12,
  pairwise = null,
}) {
  /** @type {[{key: SortKey, dir: 'asc'|'desc'}|null, Function]} */
  const [sort, setSort] = useState({
    key: /** @type {SortKey} */ ("aLCVl"),
    dir: "desc",
  });
  const [query, setQuery] = useState("");

  // Toggle to show only key columns (minimal view is default)
  const [minimalView, setMinimalView] = useState(true);

  // Toggle for Conditional Independence Value selection (persisted)
  const [useAdjustedIndependence, setUseAdjustedIndependence] = useState(() => {
    const saved = localStorage.getItem("loi_useAdjustedIndependence");
    if (saved === null) return true; // default to Yes
    return saved === "true";
  });
  useEffect(() => {
    localStorage.setItem(
      "loi_useAdjustedIndependence",
      String(useAdjustedIndependence)
    );
  }, [useAdjustedIndependence]);

  // Coefficients for Weighted loop value (persisted localstorage)
  const [composite, setComposite] = useState(() => {
    const v = localStorage.getItem("loi_coeff_composite");
    return v !== null ? Number(v) : 1;
  });
  const [coeffSFC, setCoeffSFC] = useState(() => {
    const v = localStorage.getItem("loi_coeff_sfc");
    return v !== null ? Number(v) : 1;
  });
  const [coeffCIV, setCoeffCIV] = useState(() => {
    const v = localStorage.getItem("loi_coeff_civ");
    return v !== null ? Number(v) : 1;
  });

  // Read-only coefficient mirrored from DDM's impactWeight (persisted by DDM under 'ddmImpactWeight')
  const [ddmImpactWeight, setDdmImpactWeight] = useState(() => {
    const v = localStorage.getItem("ddmImpactWeight");
    return v !== null ? Number(v) : 0.5;
  });

  // Keep it in sync if updated elsewhere (e.g., in DDM)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ddmImpactWeight") {
        const v = e.newValue !== null ? Number(e.newValue) : null;
        if (v !== null && Number.isFinite(v)) setDdmImpactWeight(v);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Also refresh on focus (covers same-tab changes if DDM lives in same SPA route)
  useEffect(() => {
    const onFocus = () => {
      const v = localStorage.getItem("ddmImpactWeight");
      if (v !== null) {
        const num = Number(v);
        if (Number.isFinite(num)) setDdmImpactWeight(num);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  useEffect(() => {
    localStorage.setItem("loi_coeff_composite", String(composite));
  }, [composite]);
  useEffect(() => {
    localStorage.setItem("loi_coeff_sfc", String(coeffSFC));
  }, [coeffSFC]);
  useEffect(() => {
    localStorage.setItem("loi_coeff_civ", String(coeffCIV));
  }, [coeffCIV]);

  // 1st order factor selection (persisted)
  const [firstOrder, setFirstOrder] = useState(() => {
    try {
      const raw = localStorage.getItem("loi_firstOrder");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  });

  // Persist selection whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("loi_firstOrder", JSON.stringify(firstOrder));
    } catch (_) {}
  }, [firstOrder]);

  // Ensure stored ids are valid for the current graph
  useEffect(() => {
    if (!nodes?.length) return;
    const valid = new Set(nodes.map((n) => n.id));
    setFirstOrder((prev) => prev.filter((id) => valid.has(id)));
  }, [nodes]);

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

  // Frequency of each factor across all detected loops (simple cycles)
  const loopFreq = useMemo(() => {
    const freqMap = new Map(nodes.map((n) => [n.id, 0]));
    if (nodes.length && edges.length) {
      const cycles = findSimpleCycles(nodes, edges, maxLen);
      for (const ids of cycles) {
        for (const id of ids) {
          if (freqMap.has(id)) freqMap.set(id, (freqMap.get(id) || 0) + 1);
        }
      }
    }
    const rows = Array.from(freqMap.entries()).map(([id, count]) => ({
      id,
      label: labelFor(id, nodes),
      freq: count,
    }));
    // Sort by freq desc, then label asc
    rows.sort((a, b) => b.freq - a.freq || a.label.localeCompare(b.label));
    return rows;
  }, [nodes, edges, maxLen]);

  const freqMap = useMemo(() => {
    const m = new Map();
    for (const r of loopFreq) m.set(r.id, r.freq);
    return m;
  }, [loopFreq]);

  const autoRows = useMemo(
    () =>
      buildRowsFromGraph(
        nodes,
        edges,
        maxLen,
        pairwise,
        firstOrder,
        freqMap,
        useAdjustedIndependence,
        composite,
        coeffSFC,
        coeffCIV
      ),
    [
      nodes,
      edges,
      maxLen,
      pairwise,
      firstOrder,
      freqMap,
      useAdjustedIndependence,
      composite,

      coeffSFC,
      coeffCIV,
    ]
  );
  const tableRows = autoRows.length ? autoRows : rows;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? tableRows.filter((r) => r.stella.toLowerCase().includes(q))
      : tableRows;

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
    container: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    headerRow: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },
    title: { fontSize: 18, fontWeight: 600 },
    search: {
      padding: "8px 10px",
      border: "1px solid #d1d5db",
      borderRadius: 10,
      width: 320,
      maxWidth: "100%",
    },
    tableWrap: {
      overflow: "auto",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
    },
    table: {
      width: "100%",

      fontSize: 13,
      borderCollapse: "separate",
      borderSpacing: 0,
    },
    th: {
      position: "sticky",
      top: 0,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "saturate(180%) blur(4px)",
      textAlign: "left",
      padding: "8px 10px",
      borderBottom: "1px solid #e5e7eb",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    thClickable: { cursor: "pointer", textDecoration: "none" },
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid #f3f4f6",
      verticalAlign: "top",
    },
    mono: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.35,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    button: {
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: "4px 8px",
      fontSize: 12,
      background: "white",
    },
    hint: { color: "#6b7280", fontSize: 12 },
  };

  const Th = ({ label, icon, onClick, minWidth, width }) => (
    <th
      style={{
        ...styles.th,
        ...(onClick ? styles.thClickable : {}),
        ...(minWidth ? { minWidth } : {}),
        ...(width ? { width } : {}),
      }}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13 }}>Coefficients:</span>
            <label style={{ fontSize: 12 }}>
              Composite(%)
              <input
                type="number"
                step={0.01}
                value={composite}
                onChange={(e) => setComposite(Number(e.target.value) || 0)}
                style={{
                  width: 72,
                  marginLeft: 6,
                  padding: "4px 6px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Steering(%)
              <input
                type="number"
                step={0.01}
                value={coeffSFC}
                onChange={(e) => setCoeffSFC(Number(e.target.value) || 0)}
                style={{
                  width: 72,
                  marginLeft: 6,
                  padding: "4px 6px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Independence (%)
              <input
                type="number"
                step={0.01}
                value={coeffCIV}
                onChange={(e) => setCoeffCIV(Number(e.target.value) || 0)}
                style={{
                  width: 72,
                  marginLeft: 6,
                  padding: "4px 6px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              />
            </label>
            {/* DDM Impact Weight (editable; persists to localStorage for DDM to read) */}

            <label style={{ fontSize: 13 }}>
              Longest Loop Independence:
              <select
                value={useAdjustedIndependence ? "Yes" : "No"}
                onChange={(e) =>
                  setUseAdjustedIndependence(e.target.value === "Yes")
                }
                style={{
                  marginLeft: 8,
                  padding: "4px 6px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }} title="Impact Weight (%)">
              Impact Weight (%)
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 6px",
                  borderRadius: 6,
                  color: "#111827",
                  textAlign: "right",
                }}
              >
                {Number.isFinite(ddmImpactWeight)
                  ? ddmImpactWeight.toFixed(2)
                  : ""}
              </span>
            </label>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search loops"
            style={styles.search}
          />
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
            }}
          >
            <input
              type="checkbox"
              checked={!minimalView}
              onChange={(e) => setMinimalView(!e.target.checked)}
            />
            Show all columns
          </label>
        </div>
      </div>

      <div style={styles.tableWrap}>
        {minimalView ? (
          <table
            style={styles.table}
            key={`${
              useAdjustedIndependence ? "civ-adjusted" : "civ-normal"
            }-${composite}-${coeffSFC}-${coeffCIV}-minimal`}
          >
            <thead>
              <tr>
                <Th label="Loop" />
                <Th label="Loop length" minWidth={70} width={70} />
                <Th
                  label="Normalised loop composite value (nLCVl)"
                  minWidth={120}
                  width={120}
                />
                <Th
                  label="Normalised steering factors (nSFCl)"
                  minWidth={120}
                  width={120}
                />
                <Th
                  label="Conditional Independence Value (CIV)"
                  icon={sortIcon("CIV")}
                  onClick={() => requestSort("CIV")}
                  minWidth={140}
                  width={140}
                />
                <Th
                  label="Normalised weighted loop value (nWLV)"
                  icon={sortIcon("nWLV")}
                  onClick={() => requestSort("nWLV")}
                  minWidth={120}
                  width={120}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...styles.td, ...styles.mono }}>{r.stella}</td>
                  <td style={{ ...styles.td, width: 50 }}>
                    {fmt(r.loopLength)}
                  </td>
                  <td style={{ ...styles.td, width: 80 }}>{fmt(r.nLCVl)}</td>
                  <td style={{ ...styles.td, width: 80 }}>{fmt(r.nSFC)}</td>
                  <td style={{ ...styles.td, width: 90 }}>{fmt(r.CIV)}</td>
                  <td
                    style={{
                      ...styles.td,
                      width: 90,
                      ...greenBoxStyle(r.nWLV),
                    }}
                  >
                    {fmt(r.nWLV)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table
            style={styles.table}
            key={`${
              useAdjustedIndependence ? "civ-adjusted" : "civ-normal"
            }-${composite}-${coeffSFC}-${coeffCIV}`}
          >
            <thead>
              <tr>
                <Th label="Loop" minWidth={280} />
                <Th label="Loop length" minWidth={70} />
                <Th label="Raw loop composite value" minWidth={100} />
                <Th
                  label="Adjusted Loop Composite Value (aLCVl)"
                  minWidth={100}
                />
                <Th
                  label="Normalised loop composite value (nLCVl)"
                  minWidth={80}
                />
                <Th label="Steering factor count" minWidth={100} />
                <Th label="Normalised steering factors (nSFCl)" minWidth={80} />
                <Th label="Total overlap Value" minWidth={100} />
                <Th label="Normalised independent loop value" minWidth={120} />
                <Th label="Adjusted independent loop value" minWidth={120} />
                <Th
                  label="Normalised adjusted independent loop value"
                  minWidth={120}
                />
                <Th
                  label="Conditional Independence Value (CIV)"
                  icon={sortIcon("CIV")}
                  onClick={() => requestSort("CIV")}
                  minWidth={140}
                  width={140}
                />
                <Th
                  label="Weighted loop value"
                  icon={sortIcon("weightedLoopValue")}
                  onClick={() => requestSort("weightedLoopValue")}
                  minWidth={120}
                  width={120}
                />
                <Th
                  label="Normalised weighted loop value (nWLV)"
                  icon={sortIcon("nWLV")}
                  onClick={() => requestSort("nWLV")}
                  minWidth={120}
                  width={120}
                />
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
                  <td style={styles.td}>{fmt(r.totalOverlap)}</td>
                  <td style={styles.td}>
                    {fmt(r.normalisedIndependentLoopValue)}
                  </td>
                  <td style={styles.td}>
                    {fmt(r.adjustedIndependentLoopValue)}
                  </td>
                  <td style={styles.td}>
                    {fmt(r.normalisedAdjustedIndependentLoopValue)}
                  </td>
                  <td style={styles.td}>{fmt(r.CIV)}</td>
                  <td style={styles.td}>{fmt(r.weightedLoopValue)}</td>
                  <td style={{ ...styles.td, ...greenBoxStyle(r.nWLV) }}>
                    {fmt(r.nWLV)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 1st order factor selection */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            1st order factor selection
          </h2>
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
              cursor:
                firstOrder.length >= nodeOptions.length
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            + Add factor
          </button>
        </div>

        {firstOrder.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            No factors selected yet. Click <em>Add factor</em> to start.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {firstOrder.map((id, idx) => (
              <div
                key={idx}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <span style={{ width: 20, textAlign: "right", fontSize: 12 }}>
                  {idx + 1}.
                </span>
                <select
                  value={id}
                  onChange={(e) => updateFirstOrder(idx, e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                >
                  {nodeOptions.map((opt) => {
                    const takenElsewhere = firstOrder.some(
                      (v, i2) => i2 !== idx && v === opt.id
                    );
                    return (
                      <option
                        key={opt.id}
                        value={opt.id}
                        disabled={takenElsewhere}
                      >
                        {opt.label}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => removeFirstOrder(idx)}
                  title="Remove"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 12,
                    background: "white",
                  }}
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

      {/* Factor frequency table */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <h2
          style={{ fontSize: 14, fontWeight: 600, margin: 0, marginBottom: 8 }}
        >
          Factor frequency across loops
        </h2>
        <div
          style={{
            overflow: "auto",
            border: "1px solid #f3f4f6",
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 13,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th style={styles.th}>Factor</th>
                <th style={styles.th}>Frequency</th>
              </tr>
            </thead>
            <tbody>
              {loopFreq.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>{r.label}</td>
                  <td style={styles.td}>{r.freq}</td>
                </tr>
              ))}
              {loopFreq.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No factors available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
