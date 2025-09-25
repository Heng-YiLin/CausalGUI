import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  ReferenceLine,
  ReferenceDot,
  LabelList,
} from "recharts";

const toNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

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

function computeActiveMetrics(nodes = [], edges = [], impactWeight = 0.5) {
  const w = toNum(impactWeight);
  const byId = new Map(
    nodes.map((n) => [
      n.id,
      { aiv: 0, piv: 0, acv: 0, pcv: 0, impactWeight: w, wav: 0, wpv: 0 },
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
    m.wav = m.impactWeight * m.aiv + (1 - m.impactWeight) * m.acv; // Y axis
    m.wpv = m.impactWeight * m.piv + (1 - m.impactWeight) * m.pcv; // X axis
  }
  return byId;
}

export default function FactorQuadChart({
  nodes = [],
  edges = [],
  impactWeight = 0.5,
  height = 420,
}) {
  const metricsById = useMemo(
    () => computeActiveMetrics(nodes, edges, impactWeight),
    [nodes, edges, impactWeight]
  );
  const data = useMemo(() => {
    return nodes.map((n, i) => {
      const m = metricsById.get(n.id) || {};
      const alpha = alphaLabel(i); // A, B, C...
      return {
        id: alpha,
        x: m.wpv ?? 0,
        y: m.wav ?? 0,
        label: alpha,
      };
    });
  }, [nodes, metricsById]);
  const domains = useMemo(() => {
    if (!data.length)
      return { minX: 0, maxX: 1, minY: 0, maxY: 1, cx: 0.5, cy: 0.5 };
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    return { minX, maxX, minY, maxY, cx, cy };
  }, [data]);

  const midX = (domains.minX + domains.maxX) / 2;
  const midY = (domains.minY + domains.maxY) / 2;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 24, right: 24, bottom: 32, left: 48 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Raw WPV"
            label={{ value: "Raw WPV", position: "bottom" }}
            domain={[domains.minX, domains.maxX]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Raw WAV"
            label={{ value: "Raw WAV", angle: -90, position: "left" }}
            domain={[domains.minY, domains.maxY]}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    <div>
                      <strong>ID:</strong> {d.id}
                    </div>
                    <div>Raw WPV: {d.x}</div>
                    <div>Raw WAV: {d.y}</div>
                  </div>
                );
              }
              return null;
            }}
          />

          <ReferenceLine x={midX} stroke="#2e7d32" strokeWidth={2} />
          <ReferenceLine y={midY} stroke="#2e7d32" strokeWidth={2} />

          <ReferenceDot
            x={(domains.minX + midX) / 2}
            y={domains.maxY}
            r={0}
            label={{
              value: "Steering factors",
              position: "top",
              fontSize: 16,
              fontWeight: 700,
            }}
          />
          <ReferenceDot
            x={(midX + domains.maxX) / 2}
            y={domains.maxY}
            r={0}
            label={{
              value: "Ambivalent factors",
              position: "top",
              fontSize: 16,
              fontWeight: 700,
            }}
          />
          <ReferenceDot
            x={(domains.minX + midX) / 2}
            y={domains.minY}
            r={0}
            label={{
              value: "Autonomous factors",
              position: "bottom",
              fontSize: 16,
              fontWeight: 700,
            }}
          />
          <ReferenceDot
            x={(midX + domains.maxX) / 2}
            y={domains.minY}
            r={0}
            label={{
              value: "Measuring factors",
              position: "bottom",
              fontSize: 16,
              fontWeight: 700,
            }}
          />

          <Scatter name="Nodes" data={data} fill="#2e7d32">
            <LabelList dataKey="label" position="right" fontSize={12} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
