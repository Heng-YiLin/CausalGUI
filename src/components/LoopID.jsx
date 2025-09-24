import React, { useEffect, useMemo, useState } from "react";
import Collapsible from "react-collapsible";

/**
 * LoopID (collapsible list + colored arrows + parity tag)
 * - Cycles de-duped by rotation (direction preserved).
 * - Coloring: "+" green, "-" red, null/undefined grey
 * - Parity:
 *   - if ANY null/undefined sign in the cycle => tag "uncoded", no R/B
 *   - else even # of "-" => R, odd # of "-" => B
 * - Impact/Control cells are clickable (when editable) and cycle through [null,0,1,2,3,4,5].
 *
 *   Props:
 *   - nodes: array of node objects
 *   - edges: array of edge objects
 *   - maxLen: max cycle length
 *   - topK: max number of cycles
 *   - node?: focused node object from parent
 *   - id?: focused node id from parent
 *   - onUpdateEdgeData?: function (edgeId, patch) to mutate edge.data
 *   - editable?: boolean to show/hide editing controls
 */
export default function LoopID({
  nodes = [],
  edges = [],
  maxLen = 8,
  topK = 1000,
  node = null, // optional: focused node object from parent
  id = null, // optional: focused node id from parent
  onUpdateEdgeData = null, // optional callback(edgeId, patch)
  editable = true, // show buttons when true
}) {
  const [loops, setLoops] = useState([]); // [{nodes}]
  const [sortMode, setSortMode] = useState("none"); // "none" | "R-first" | "B-first"
  const [filterText, setFilterText] = useState("");

  const { vertices, adj, idToLabel, edgeMap } = useMemo(() => {
    const vs = [...nodes.map((n) => n.id)].sort();
    const adj = new Map(vs.map((id) => [id, []]));
    const idToLabel = new Map(nodes.map((n) => [n.id, n.data?.label || n.id]));
    const edgeMap = new Map();

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

    const seen = new Set();
    const uniq = [];
    for (const cyc of res) {
      const key = canonicalKeyDirected(cyc);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(cyc);
    }

    // default ordering: length → label
    uniq.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      const sa = toLoopString(a, idToLabel);
      const sb = toLoopString(b, idToLabel);
      return sa.localeCompare(sb);
    });

    setLoops(uniq.map((nodes) => ({ nodes })));
  }, [vertices, adj, idToLabel, edgeMap, maxLen, topK]);

  // Suppress unused node/id if not used
  void node;
  void id;

  // expose a small helper to child components
  const updateEdgeData = (edgeId, patch) => {
    if (typeof onUpdateEdgeData === "function") {
      onUpdateEdgeData(edgeId, patch);
    } else {
      console.warn("LoopID.onUpdateEdgeData not provided");
    }
  };

  // Apply sort mode (R-first / B-first). Uncoded last.
  const sortedLoops = useMemo(() => {
    const term = filterText.trim().toLowerCase();

    // keep loops that contain a node whose label OR id includes the term
    const matches = (loopNodes) => {
      if (!term) return true;
      for (const id of loopNodes) {
        const label = String(idToLabel.get(id) ?? id).toLowerCase();
        if (label.includes(term)) return true;
      }
      return false;
    };

    // 1) filter
    const base = loops.filter(({ nodes }) => matches(nodes));

    // 2) sort by chosen mode (R-first / B-first), uncoded last
    const arr = [...base];
    const rank = (nodes) => {
      const { rb } = polarityInfo(nodes, edgeMap); // "R" | "B" | null
      if (sortMode === "R-first") return rb === "R" ? 0 : rb === "B" ? 1 : 2;
      if (sortMode === "B-first") return rb === "B" ? 0 : rb === "R" ? 1 : 2;
      return 1;
    };

    arr.sort((A, B) => {
      const rA = rank(A.nodes);
      const rB = rank(B.nodes);
      if (rA !== rB) return rA - rB;

      // fallback: length → label for stable, readable ordering
      if (A.nodes.length !== B.nodes.length)
        return A.nodes.length - B.nodes.length;
      const sa = toLoopString(A.nodes, idToLabel);
      const sb = toLoopString(B.nodes, idToLabel);
      return sa.localeCompare(sb);
    });

    return arr;
  }, [loops, sortMode, filterText, edgeMap, idToLabel]);

  return (
    <div style={{ padding: 12 }}>
      {/* HEADER (search + clear + sort) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>
          Loops (
          {filterText
            ? `${sortedLoops.length} of ${loops.length}`
            : loops.length}
          {loops.length === topK ? "+" : ""})
        </h3>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          {/* Filter input */}
          <div style={{ position: "relative" }}>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by node name…"
              style={{
                padding: "6px 28px 6px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
                width: 220,
              }}
            />
            {filterText && (
              <button
                onClick={() => setFilterText("")}
                aria-label="Clear"
                style={{
                  position: "absolute",
                  right: 4,
                  top: 3,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Sort buttons (reuse from earlier) */}
          <SortButton
            active={sortMode === "R-first"}
            onClick={() =>
              setSortMode(sortMode === "R-first" ? "none" : "R-first")
            }
            label="Reinforcing first"
          />
          <SortButton
            active={sortMode === "B-first"}
            onClick={() =>
              setSortMode(sortMode === "B-first" ? "none" : "B-first")
            }
            label="Balancing first"
          />
        </div>
      </div>

      {sortedLoops.length === 0 ? (
        <div style={{ color: "#666" }}>
          {filterText ? (
            <>
              No loops match “<strong>{filterText}</strong>”.
            </>
          ) : (
            "No loops found."
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {sortedLoops.map(({ nodes }, i) => {
            const key = canonicalKeyDirected(nodes) + ":" + i;
            const { rbText, rbColor } = polarityInfo(nodes, edgeMap);

            const Trigger = (open) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                aria-label="toggle loop details"
              >
                <div style={{ fontFamily: "monospace", flex: "1 1 auto" }}>
                  {toLoopJSX(nodes, idToLabel, edgeMap, filterText)}
                </div>

                <span style={{ color: "#555", fontSize: 12 }}>
                  {rbText ? (
                    <>
                      (
                      <span style={{ color: rbColor, fontWeight: 600 }}>
                        {rbText}
                      </span>
                      )
                    </>
                  ) : (
                    <>uncoded</>
                  )}
                </span>
                <span
                  style={{
                    fontSize: "1.25em",
                    lineHeight: 1,
                    color: "#666",
                    marginLeft: "auto",
                  }}
                >
                  {open ? "▴" : "▾"}
                </span>
              </div>
            );

            return (
              <div
                key={key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <Collapsible
                  trigger={Trigger(false)}
                  triggerWhenOpen={Trigger(true)}
                  transitionTime={150}
                >
                  <div
                    style={{ borderTop: "1px solid #eee", padding: "8px 12px" }}
                  >
                    <LoopDetails
                      nodes={nodes}
                      idToLabel={idToLabel}
                      edgeMap={edgeMap}
                      onUpdateEdgeData={updateEdgeData}
                      editable={editable}
                    />
                  </div>
                </Collapsible>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --- tiny button component for the header --- */
function SortButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
        background: active ? "#eff6ff" : "#fff",
        color: active ? "#1d4ed8" : "#374151",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* ---------------- details panel ---------------- */

function LoopDetails({
  nodes,
  idToLabel,
  edgeMap,
  onUpdateEdgeData,
  editable = true,
}) {
  const N = nodes.length;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const u = nodes[i];
    const v = nodes[(i + 1) % N];
    const e = edgeMap.get(`${u}→${v}`);
    const sign =
      e?.data?.sign === "+" || e?.data?.sign === "-" ? e.data.sign : null;
    const color = sign === "+" ? "#0a0" : sign === "-" ? "#c00" : "#888";
    rows.push({
      edgeId: e?.id,
      from: idToLabel.get(u) || u,
      to: idToLabel.get(v) || v,
      sign,
      impact: e?.data?.impact ?? null,
      control: e?.data?.control ?? null,
      color,
    });
  }

  // Value cycling helpers
  const IMPACT_CYCLE = [null, 1, 2, 3];
  const CONTROL_CYCLE = [null, 0, 1, 2, 3];
  const SIGN_CYCLE = [null, "+", "-"];

  const nextFromCycle = (curr, cycle) => {
    const i = cycle.findIndex((v) => v === curr);
    const nextIdx = i === -1 ? 0 : (i + 1) % cycle.length;
    return cycle[nextIdx];
  };
  const handleSignClick = (edgeId, curr) => {
    const i = SIGN_CYCLE.findIndex((v) => v === curr);
    const next = SIGN_CYCLE[i === -1 ? 0 : (i + 1) % SIGN_CYCLE.length];
    onUpdateEdgeData?.(edgeId, { sign: next });
  };

  const handleImpactClick = (edgeId, curr) => {
    const next = nextFromCycle(curr, IMPACT_CYCLE);
    onUpdateEdgeData?.(edgeId, { impact: next });
  };

  const handleControlClick = (edgeId, curr) => {
    const next = nextFromCycle(curr, CONTROL_CYCLE);
    onUpdateEdgeData?.(edgeId, { control: next });
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 90px 160px 160px",
          padding: "6px 0",
          fontWeight: 600,
          fontSize: 12,
          color: "#444",
        }}
      >
        <div>From</div>
        <div>To</div>
        <div>{editable ? "Sign (tap to cycle)" : "Sign"}</div>
        <div>{editable ? "Impact (tap to cycle)" : "Impact"}</div>
        <div>{editable ? "Control (tap to cycle)" : "Control"}</div>
      </div>
      {rows.map((r, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 90px 160px 160px",
            padding: "8px 0",
            alignItems: "center",
            borderTop: "1px solid #eee",
            fontSize: 13,
          }}
        >
          <div style={{ fontFamily: "monospace" }}>{r.from}</div>
          <div style={{ fontFamily: "monospace" }}>{r.to}</div>
          <div>
            {editable ? (
              <button
                onClick={() => handleSignClick(r.edgeId, r.sign)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 64,
                  color:
                    r.sign === "+" ? "#0a0" : r.sign === "-" ? "#c00" : "#666",
                  fontWeight: 600,
                }}
                aria-label="Cycle sign"
                disabled={!r.edgeId}
                title="Cycle sign"
              >
                {r.sign ?? "—"}
              </button>
            ) : (
              <span style={{ color: r.color, fontWeight: 600 }}>
                {r.sign ?? "—"}
              </span>
            )}
          </div>
          <div>
            {editable ? (
              <button
                onClick={() => handleImpactClick(r.edgeId, r.impact)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 64,
                }}
                aria-label="Cycle impact value"
                disabled={!r.edgeId}
                title="Cycle impact"
              >
                {r.impact ?? "—"}
              </button>
            ) : (
              r.impact ?? "—"
            )}
          </div>
          <div>
            {editable ? (
              <button
                onClick={() => handleControlClick(r.edgeId, r.control)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 64,
                }}
                aria-label="Cycle control value"
                disabled={!r.edgeId}
                title="Cycle control"
              >
                {r.control ?? "—"}
              </button>
            ) : (
              r.control ?? "—"
            )}
          </div>
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
      if (wIdx < startIdx) continue; // root at min vertex
      if (w === start && path.length >= 2) {
        result.push([...path]); // found cycle
        if (result.length >= maxCount) return;
        continue;
      }
      if (onPath.has(w)) continue; // simple (no repeats)
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

// Normalize sign and color arrows; larger arrows
function edgeSign(u, v, edgeMap) {
  const s = edgeMap.get(`${u}→${v}`)?.data?.sign;
  return s === "+" || s === "-" ? s : null;
}

// Colored + larger arrows JSX
function toLoopJSX(nodes, idToLabel, edgeMap, highlightTerm = "") {
  const term = highlightTerm.trim().toLowerCase();
  const parts = [];
  const N = nodes.length;

  const renderLabel = (id, key) => {
    const text = idToLabel.get(id) || id;
    if (!term || !String(text).toLowerCase().includes(term)) {
      return (
        <span key={key} style={{ marginRight: 4 }}>
          {text}
        </span>
      );
    }
    const t = String(text);
    const i = t.toLowerCase().indexOf(term);
    const before = t.slice(0, i);
    const mid = t.slice(i, i + term.length);
    const after = t.slice(i + term.length);
    return (
      <span key={key} style={{ marginRight: 4 }}>
        {before}
        <span
          style={{ background: "#fff3bf", borderRadius: 3, padding: "0 2px" }}
        >
          {mid}
        </span>
        {after}
      </span>
    );
  };

  for (let i = 0; i < N; i++) {
    const u = nodes[i];
    const v = nodes[(i + 1) % N];
    const sign = edgeSign(u, v, edgeMap);
    const color = sign === "+" ? "#0a0" : sign === "-" ? "#c00" : "#888";

    parts.push(renderLabel(u, `n-${i}`));
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
  parts.push(renderLabel(nodes[0], "close-label"));
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
    else if (s !== "+") nul++; // anything not "+" or "-" is uncoded
  }

  // Any null/undefined sign => uncoded
  if (nul > 0) return { tag: "uncoded", rb: null, rbText: null, rbColor: null };

  const reinforcing = neg % 2 === 0;
  return {
    tag: null,
    rb: reinforcing ? "R" : "B",
    rbText: reinforcing ? "Reinforcing" : "Balancing",
    rbColor: reinforcing ? "#c00" : "#06c", // R=red, B=blue
  };
}

// adam partially empty cycle
//group more visually
// does he want to see polarity in the ddm
// more detailed edge for loops
// sort loop by length node
//search node filter feature
//update
//ask adam about labelings- use button to trigger labeling
