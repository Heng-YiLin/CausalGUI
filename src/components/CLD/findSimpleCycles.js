/**
 * findSimpleCycles
 * enumerates simple directed cycles drawn in the CLD graph using a canonical rooting DFS.
 * Canonical rooting uses least vertex by id to avoid duplicates.
 * Max len bounds cycle length and topK bound total number of cycles determined through meetings.
 * 
 * @param {*} nodes 
 * @param {*} edges 
 * @param {*} maxLen 
 * @param {*} topK 
 * @returns 
 */
export function findSimpleCycles(nodes, edges, maxLen = 8, topK = 1000) {
  // --- Build adjacency (directed) and an edge lookup map ---
  const adj = new Map();
  const outEdges = new Map(); // map: src -> array of edges
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    if (!adj.has(e.source) || !adj.has(e.target)) return;
    adj.get(e.source).add(e.target);
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source).push(e);
  });

  // Canonical-rooting DFS setup
  const nodeIds = nodes.map((n) => n.id).sort(); // total order over vertices
  const idx = new Map(nodeIds.map((v, i) => [v, i]));

  const cycles = [];
  const seen = new Set(); // rotation-invariant keys to guard against duplicates

  function canonicalKey(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return "";
    const rotations = ids.map((_, k) => ids.slice(k).concat(ids.slice(0, k)));
    // Sort the rotations alphabetically and choose the smallest one
    // as the canonical representation for this loop.
    return rotations.map((r) => r.join("->")).sort()[0];
  }

  /**
   * DFS with canonical rooting and simple cycle constraint.
   * @param {string} start - cycle root 
   * @param {string} v - current node/vertex
   * @param {string[]} path - current path 
   * @param {Set<string>} onPath - membership set to enforce no repeats
   * @returns 
   */
  function dfs(start, v, path, onPath) {
    if (cycles.length >= topK) return;
    if (path.length > maxLen) return;

    const startIdx = idx.get(start);
    for (const w of adj.get(v) || []) {
      const wIdx = idx.get(w);
      // Enforce canonical rooting: only traverse vertices whose index >= start's
      if (wIdx < startIdx) continue;

      if (w === start && path.length >= 2) {
        // Found a simple cycle; record without repeating start in returned path
        const pathOnly = [...path];
        const key = canonicalKey(pathOnly);
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(pathOnly);
        }
        if (cycles.length >= topK) return;
        continue;
      }

      if (onPath.has(w)) continue; // simple cycle constraint
      if (path.length + 1 > maxLen) continue;

      onPath.add(w);
      path.push(w);
      dfs(start, w, path, onPath);
      path.pop();
      onPath.delete(w);
    }
  }

  for (const s of nodeIds) {
    const onPath = new Set([s]);
    dfs(s, s, [s], onPath);
    if (cycles.length >= topK) break;
  }

  // --- Ensure 2-node cycles are included even if missed (safety net) ---
  // If there exists both a->b and b->a, add [a,b] as a cycle.
  nodes.forEach((na) => {
    const a = na.id;
    const outs = outEdges.get(a) || [];
    outs.forEach((e) => {
      const b = e.target;
      if (!adj.has(b)) return;
      const revList = outEdges.get(b) || [];
      const hasRev = revList.some((x) => x.target === a);
      if (hasRev) {
        const path = [a, b];
        const key = canonicalKey(path);
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(path);
        }
      }
    });
  });

  // Attach edge info per cycle (polarity and centroid), preserving previous behaviour
  function edgeLookup(a, b) {
    const list = outEdges.get(a) || [];
    return list.find((e) => e.target === b);
  }

  return cycles.map((nodeCycle) => {
    // Determine loop polarity: even negatives => reinforcing (R); odd => balancing (B)
    let neg = 0;
    for (let i = 0; i < nodeCycle.length; i++) {
      const a = nodeCycle[i];
      const b = nodeCycle[(i + 1) % nodeCycle.length];
      const e = edgeLookup(a, b);
      const s = e?.data?.sign;
      if (s === "-") neg++;
    }
    const type = neg % 2 === 0 ? "R" : "B";

    // Centroid of nodes in canvas coords
    let sx = 0,
      sy = 0;
    const pts = nodeCycle
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean);
    pts.forEach((n) => {
      const w = n.width || 0;
      const h = n.height || 0;
      sx += n.position.x + w / 2;
      sy += n.position.y + h / 2;
    });
    const cx = pts.length ? sx / pts.length : 0;
    const cy = pts.length ? sy / pts.length : 0;

    return { ids: nodeCycle, type, cx, cy };
  });
}
