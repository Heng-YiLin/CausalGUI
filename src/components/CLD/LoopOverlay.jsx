import React, { useEffect, useState } from "react";
import { useStore } from "@xyflow/react";
import { findSimpleCycles } from "./findSimpleCycles";

const STORAGE_KEY = "cld.loopOffsets";

export default function LoopOverlay({ nodes, edges }) {
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const [{ ox, oy }, setOrigin] = useState({ ox: 0, oy: 0 });
  useEffect(() => {
    const update = () => {
      const el = document.querySelector('.react-flow');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOrigin({ ox: r.left, oy: r.top });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, []);
  const loops = findSimpleCycles(nodes, edges);

  // Fast edge lookup by source -> target
  const outBySource = new Map();
  edges.forEach((e) => {
    if (!outBySource.has(e.source)) outBySource.set(e.source, []);
    outBySource.get(e.source).push(e);
  });
  const edgeHasPolarity = (a, b) => {
    const list = outBySource.get(a) || [];
    const e = list.find((x) => x.target === b);
    const s = e?.data?.sign;
    return s === "+" || s === "-";
  };

  // Only keep loops where EVERY edge in the loop has a polarity
  const renderLoops = loops.filter((lp) => {
    const ids = lp.ids;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % ids.length];
      if (!edgeHasPolarity(a, b)) return false;
    }
    return true;
  });

  // Per-loop offsets in FLOW coordinates so they behave correctly across zoom/pan
  const [offsets, setOffsets] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
    } catch {}
  }, [offsets]);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setOffsets((prev) => (JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed));
      } catch {}
    };
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Stable loop key independent of rotation order
  const keyOf = (lp) => lp.ids.slice().sort().join("->");

  return (
    <>
      {renderLoops.map((lp) => {
        const k = keyOf(lp);
        const off = offsets[k] || { dx: 0, dy: 0 };

        // Flow -> Screen coords
        const x = ox + tx + (lp.cx + off.dx) * zoom;
        const y = oy + ty + (lp.cy + off.dy) * zoom;

        const isR = lp.type === "R";
        const size = 15 * zoom;
        const fontPx = 10 * zoom;
        const borderColor = isR ? "#16a34a" : "#dc2626";
        const borderWidth = Math.max(1, 1.5 * zoom);

        const bg = isR ? "rgba(22,163,74,0.14)" : "rgba(220,38,38,0.14)";
        const color = isR ? "#166534" : "#991b1b";

        return (
          <div
            key={k}
            style={{
              position: "fixed",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: bg,
              border: `${borderWidth}px solid ${borderColor}`,
              color,
              fontWeight: 800,
              fontSize: fontPx,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
              pointerEvents: "auto",
              cursor: "grab",
              zIndex: 10000,
              touchAction: "none",
            }}
            title={isR ? "Reinforcing loop" : "Balancing loop"}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const target = e.currentTarget;
              const pointerId = e.pointerId;
              const startX = e.clientX;
              const startY = e.clientY;
              const start = offsets[k] || { dx: 0, dy: 0 };

              try { target.setPointerCapture(pointerId); } catch {}
              target.style.cursor = "grabbing";

              const onMove = (mv) => {
                const dxScreen = mv.clientX - startX;
                const dyScreen = mv.clientY - startY;
                const dxFlow = dxScreen / zoom;
                const dyFlow = dyScreen / zoom;
                setOffsets((prev) => ({
                  ...prev,
                  [k]: { dx: start.dx + dxFlow, dy: start.dy + dyFlow },
                }));
              };

              const onUp = () => {
                try { target.releasePointerCapture(pointerId); } catch {}
                target.style.cursor = "grab";
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
                document.removeEventListener("pointercancel", onUp);
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };

              document.addEventListener("pointermove", onMove);
              document.addEventListener("pointerup", onUp, { once: true });
              document.addEventListener("pointercancel", onUp, { once: true });
              // Fallback for environments not fully supporting Pointer Events
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp, { once: true });
            }}
          >
            {lp.type}
          </div>
        );
      })}
    </>
  );
}