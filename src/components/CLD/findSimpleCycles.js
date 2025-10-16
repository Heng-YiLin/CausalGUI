export function findSimpleCycles(nodes, edges) {
  // Build adjacency list keyed by node id
  const adj = new Map();
  const outEdges = new Map(); // map: src -> array of edges
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    if (!adj.has(e.source) || !adj.has(e.target)) return;
    adj.get(e.source).add(e.target);
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source).push(e);
  });

  const cycles = [];
  const blocked = new Set();
  const B = new Map();
  const stack = [];
  const nodeIds = nodes.map((n) => n.id).sort();

  // Johnson's algorithm (lightweight)
  function unblock(u) {
    blocked.delete(u);
    const set = B.get(u);
    if (set) {
      for (const w of Array.from(set)) {
        B.get(u).delete(w);
        if (blocked.has(w)) unblock(w);
      }
    }
  }

  function circuit(v, start) {
    let found = false;
    stack.push(v);
    blocked.add(v);

    for (const w of adj.get(v) || []) {
      if (w === start) {
        cycles.push([...stack, start]);
        found = true;
      } else if (!blocked.has(w)) {
        if (circuit(w, start)) found = true;
      }
    }

    if (found) {
      unblock(v);
    } else {
      for (const w of adj.get(v) || []) {
        if (!B.has(w)) B.set(w, new Set());
        B.get(w).add(v);
      }
    }

    stack.pop();
    return found;
  }

  for (let i = 0; i < nodeIds.length; i++) {
    const start = nodeIds[i];
    circuit(start, start);
    // Remove start from graph
    for (const s of adj.keys()) {
      adj.get(s).delete(start);
    }
  }

  // Helper to canonicalize a cycle path
  function canonicalKey(path) {
    // rotate so smallest lexicographic rotation is chosen
    const rots = path.map((_, k) => path.slice(k).concat(path.slice(0, k)));
    return rots.map((r) => r.join("->")).sort()[0];
  }

  // Deduplicate by canonical rotation and remove trivial (length<2)
  const seen = new Set();
  const unique = [];
  for (const cyc of cycles) {
    // cyc ends with start, drop last for canonicalization
    const path = cyc.slice(0, -1);
    if (path.length < 2) continue; // allow 2-node cycles like A<->B
    const key = canonicalKey(path);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(path);
    }
  }

  // --- Ensure 2-node cycles are included even if missed by the DFS ---
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
          unique.push(path);
        }
      }
    });
  });

  // Attach edge info per cycle
  function edgeLookup(a, b) {
    const list = outEdges.get(a) || [];
    return list.find((e) => e.target === b);
  }

  return unique.map((nodeCycle) => {
    let neg = 0;
    for (let i = 0; i < nodeCycle.length; i++) {
      const a = nodeCycle[i];
      const b = nodeCycle[(i + 1) % nodeCycle.length];
      const e = edgeLookup(a, b);
      const s = e?.data?.sign;
      if (s === "-") neg++;
    }
    const type = neg % 2 === 0 ? "R" : "B"; // even negatives => reinforcing

    // centroid of nodes in flow coords
    let sx = 0,
      sy = 0;
    const pts = nodeCycle
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean);
    pts.forEach((n) => {
      sx += n.position.x + (n.width || 0) / 2;
      sy += n.position.y + (n.height || 0) / 2;
    });
    const cx = sx / pts.length;
    const cy = sy / pts.length;

    return { ids: nodeCycle, type, cx, cy };
  });
}