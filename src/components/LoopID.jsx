import React, { useEffect, useMemo, useState } from "react";
import Collapsible from "react-collapsible";

/**
 * LoopID (collapsible list + colored arrows + parity tag)
 * - Cycles de-duped by rotation (direction preserved).
 * - Coloring: "+" green, "-" red, null/undefined grey
 * - Parity:
 *   - if ANY null/undefined sign in the cycle => tag "uncoded", no R/B
 *   - else even # of "-" => R, odd # of "-" => B
 */
export default function LoopID({
  nodes = [],
  edges = [],
  maxLen = 8,
  topK = 1000,
}) {
  const [loops, setLoops] = useState([]); // [{nodes, tag, rb}]

  const { vertices, adj, idToLabel, edgeMap } = useMemo(() => {
    const vs = [...nodes.map((n) => n.id)].sort();
    const adj = new Map(vs.map((id) => [id, []]));
    const idToLabel = new Map(nodes.map((n) => [n.id, n.data?.label || n.id]));
    const edgeMap = new Map(); // "u→v" -> edge object

    // Collapse parallel edges to the one with largest |impact|; ignore self-loops
    const best = new Map();
    for (const e of edges) {
      if (!vs.includes(e.source) || !vs.includes(e.target)) continue;
      if (e.source === e.target) continue;
      const k = `${e.source}→${e.target}`;
      const imp = Math.abs(e?.data?.impact ?? 0);
      const cur = best.get(k);
      if (!cur || Math.abs(cur?.data?.impact ?? 0) < imp) best.set(k, e);
    }
    for (const e of best.values()) {
      adj.get(e.source).push(e.target);
      edgeMap.set(`${e.source}→${e.target}`, e);
    }

    return { vertices: vs, adj, idToLabel, edgeMap };
  }, [nodes, edges]);

  useEffect(() => {
    const res = findAllCycles(vertices, adj, { maxLen, maxCount: topK });

    // De-dupe by rotation (direction preserved)
    const seen = new Set();
    const uniq = [];
    for (const cyc of res) {
      const key = canonicalKeyDirected(cyc);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(cyc);
    }

    // Sort: by length, then by label string
    uniq.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      const sa = toLoopString(a, idToLabel);
      const sb = toLoopString(b, idToLabel);
      return sa.localeCompare(sb);
    });

    // Decorate with parity tag + R/B
    const decorated = uniq.map((cyc) => {
      const { tag, rb } = polarityInfo(cyc, edgeMap);
      return { nodes: cyc, tag, rb };
    });

    setLoops(decorated);
  }, [vertices, adj, idToLabel, edgeMap, maxLen, topK]);

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginBottom: 8 }}>
        Loops ({loops.length}{loops.length === topK ? "+" : ""})
      </h3>

      {loops.length === 0 ? (
        <div style={{ color: "#666" }}>No loops found.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {loops.map(({ nodes, tag, rb }, i) => {
            const trigger = (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "monospace" }}>
                  {toLoopJSX(nodes, idToLabel, edgeMap)}
                </div>
                <span style={{ color: "#555", fontSize: 12 }}>
                  — {tag}{rb ? ` (${rb})` : ""}
                </span>
              </div>
            );
            return (
              <Collapsible
                key={canonicalKeyDirected(nodes) + ":" + i}
                trigger={trigger}
                transitionTime={150}
              >
                <LoopDetails
                  nodes={nodes}
                  idToLabel={idToLabel}
                  edgeMap={edgeMap}
                />
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- details panel ---------------- */

function LoopDetails({ nodes, idToLabel, edgeMap }) {
  // rows: for each node u, show the edge u -> v(next)
  const N = nodes.length;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const u = nodes[i];
    const v = nodes[(i + 1) % N];
    const e = edgeMap.get(`${u}→${v}`);
    const sign = (e?.data?.sign === "+" || e?.data?.sign === "-") ? e.data.sign : null;
    const color = sign === "+" ? "#0a0" : sign === "-" ? "#c00" : "#888";
    rows.push({
      from: idToLabel.get(u) || u,
      to: idToLabel.get(v) || v,
      sign,
      impact: e?.data?.impact ?? null,
      control: e?.data?.control ?? null,
      color,
    });
  }

  return (
    <div
      style={{
        margin: "8px 0 12px",
        border: "1px solid #eee",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 90px 110px 110px",
          padding: "8px 10px",
          background: "#fafafa",
          fontWeight: 600,
          fontSize: 12,
          color: "#444",
        }}
      >
        <div>From</div>
        <div>To</div>
        <div>Sign</div>
        <div>Impact</div>
        <div>Control</div>
      </div>
      {rows.map((r, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 90px 110px 110px",
            padding: "8px 10px",
            alignItems: "center",
            borderTop: "1px solid #eee",
            fontSize: 13,
          }}
        >
          <div style={{ fontFamily: "monospace" }}>{r.from}</div>
          <div style={{ fontFamily: "monospace" }}>{r.to}</div>
          <div style={{ color: r.color, fontWeight: 600 }}>
            {r.sign ?? "—"}
          </div>
          <div>{isNil(r.impact) ? "—" : r.impact}</div>
          <div>{isNil(r.control) ? "—" : r.control}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- helpers ---------------- */

// DFS with least-vertex rooting (Johnson-style constraint)
function findAllCycles(vertices, adj, { maxLen = 8, maxCount = 1000 } = {}) {
  const idx = new Map(vertices.map((v, i) => [v, i]));
  const result = [];

  function dfs(start, v, path, onPath) {
    if (result.length >= maxCount) return;
    const startIdx = idx.get(start);

    for (const w of adj.get(v) || []) {
      const wIdx = idx.get(w);
      if (wIdx < startIdx) continue;                  // root at min vertex
      if (w === start && path.length >= 2) {
        result.push([...path]);                       // found cycle
        if (result.length >= maxCount) return;
        continue;
      }
      if (onPath.has(w)) continue;                    // simple (no repeats)
      if (path.length + 1 > maxLen) continue;

      onPath.add(w);
      path.push(w);
      dfs(start, w, path, onPath);
      path.pop();
      onPath.delete(w);
    }
  }

  for (const s of vertices) {
    const onPath = new Set([s]);
    dfs(s, s, [s], onPath);
    if (result.length >= maxCount) break;
  }
  return result;
}

// Direction-preserving canonical key (rotation only)
function canonicalKeyDirected(nodes) {
  let best = null;
  for (let i = 0; i < nodes.length; i++) {
    const rot = nodes.slice(i).concat(nodes.slice(0, i)).join(">");
    if (best === null || rot < best) best = rot;
  }
  return best;
}

// "A → B → C → A" (plain string, used for sorting only)
function toLoopString(nodes, idToLabel, close = true) {
  const labels = nodes.map((id) => idToLabel.get(id) || id);
  return close ? `${labels.join(" → ")} → ${labels[0]}` : labels.join(" → ");
}

// Normalize sign and color arrows; larger arrows requested
function edgeSign(u, v, edgeMap) {
  const s = edgeMap.get(`${u}→${v}`)?.data?.sign;
  return s === "+" || s === "-" ? s : null;
}

// Colored + larger arrows JSX
function toLoopJSX(nodes, idToLabel, edgeMap) {
  const parts = [];
  const N = nodes.length;
  for (let i = 0; i < N; i++) {
    const u = nodes[i];
    const v = nodes[(i + 1) % N];
    const labelU = idToLabel.get(u) || u;
    const sign = edgeSign(u, v, edgeMap);
    const color = sign === "+" ? "#0a0" : sign === "-" ? "#c00" : "#888";

    // node label
    parts.push(
      <span key={`n-${i}`} style={{ marginRight: 4 }}>
        {labelU}
      </span>
    );
    // arrow to next (bigger + bold)
    parts.push(
      <span
        key={`a-${i}`}
        style={{
          color,
          margin: "0 8px",
          fontSize: "1.4em",
          fontWeight: "bold",
        }}
      >
        →
      </span>
    );
  }
  // close label
  parts.push(
    <span key="close-label" style={{ marginLeft: 4 }}>
      {idToLabel.get(nodes[0]) || nodes[0]}
    </span>
  );
  return <>{parts}</>;
}

// Parity w/ "uncoded" when ANY null/undefined signs present
function polarityInfo(nodes, edgeMap) {
  const edges = nodes.map((u, i) => [u, nodes[(i + 1) % nodes.length]]);
  let neg = 0;
  let nul = 0;

  for (const [u, v] of edges) {
    const s = edgeMap.get(`${u}→${v}`)?.data?.sign;
    if (s === "-") neg++;
    else if (s !== "+") nul++; // treat everything except "+" and "-" as null/uncoded
  }

  if (nul > 0) return { tag: "uncoded", rb: null };
  const rb = neg % 2 === 0 ? "R" : "B";
  const tag = neg % 2 === 0 ? "even negatives" : "odd negatives";
  return { tag, rb };
}

function isNil(x) {
  return x === null || x === undefined;
}
