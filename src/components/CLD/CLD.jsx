import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  Background,
  ReactFlow,
  addEdge,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceLink,
  forceX,
  forceY,
} from "d3-force";
import "@xyflow/react/dist/style.css";

import CustomNode from "../../nodes/CustomNode";
import FloatingEdge from "../../edges/FloatingEdge";
import CustomConnectionLine from "../../edges/CustomConnectionLine";
import Sidebar from "./Sidebar";
import { useDnD } from "../DnDContext";
import LoopOverlay from "./LoopOverlay";

const connectionLineStyle = {
  stroke: "#b1b1b7",
};

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const defaultEdgeOptions = {
  type: "floating",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#b1b1b7",
  },
};
function sanitizeEdges(nodeList, eds) {
  const ids = new Set(nodeList.map((n) => n.id));
  return eds.filter(
    (e) =>
      ids.has(e.source) &&
      ids.has(e.target) &&
      e.source !== e.target &&
      e.source !== "rowLabel" &&
      e.target !== "rowLabel"
  );
}
function separateParallelEdges(eds) {
  // Group by unordered pair so A→B and B→A are together
  const key = (a, b) => (a < b ? `${a}__${b}` : `${b}__${a}`);
  const groups = new Map();
  eds.forEach((e) => {
    const k = key(e.source, e.target);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  });

  const updates = new Map();
  const STEP = 100; // curve separation in px (bump up if you want more)
  const EPS_SCALE = 0.06; // tiny epsilon to avoid perfect overlaps for same-direction multi-edges

  groups.forEach((arr) => {
    if (arr.length <= 1) return;

    // Deterministic order (so offsets are stable across runs)
    const sorted = [...arr].sort((a, b) => a.id.localeCompare(b.id));
    const mid = (sorted.length - 1) / 2;

    // Special nice case: exactly 2 edges (classic A→B & B→A)
    if (sorted.length === 2) {
      // Same positive magnitude for both; direction’s perpendicular will separate them
      const mag = STEP * 0.5; // e.g., 9px
      updates.set(sorted[0].id, mag);
      updates.set(sorted[1].id, mag);
      return;
    }

    // General case: symmetric magnitudes; add tiny unique epsilon so
    // multiple edges in the SAME direction don’t stack perfectly.
    sorted.forEach((e, i) => {
      const mag = Math.abs((i - mid) * STEP);
      const eps = (i / sorted.length) * STEP * EPS_SCALE; // tiny, deterministic
      updates.set(e.id, mag + eps);
    });
  });

  let changed = false;
  const next = eds.map((e) => {
    const newOffset = updates.has(e.id)
      ? updates.get(e.id)
      : e.data?.offset ?? 0;
    const prevOffset = e.data?.offset ?? 0;
    if (newOffset !== prevOffset) {
      changed = true;
      return { ...e, data: { ...e.data, offset: newOffset } };
    }
    return e;
  });

  return changed ? next : eds;
}

const CLD = ({ nodes, setNodes, edges, setEdges }) => {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [type] = useDnD();

  const [showLoops, setShowLoops] = useState(() => {
    try {
      const v = localStorage.getItem("cld.showLoops");
      return v === null ? true : v !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        const v = localStorage.getItem("cld.showLoops");
        setShowLoops(v === null ? true : v !== "false");
      } catch {}
    };
    window.addEventListener("storage", sync);
    window.addEventListener("storage-update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage-update", sync);
    };
  }, []);

  const nodeRadius = (id) => 36;
  const runLayout = useCallback(
    (mode = "force") => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const width = rect?.width || 1000;
      const height = rect?.height || 700;
      const safeEdges = sanitizeEdges(nodes, edges);

      // degree map (for charge scaling)
      const deg = new Map();
      edges.forEach((e) => {
        deg.set(e.source, (deg.get(e.source) || 0) + 1);
        deg.set(e.target, (deg.get(e.target) || 0) + 1);
      });

      const cx = width / 2;
      const cy = height / 2;
      const R = Math.max(120, Math.min(cx, cy) - 60); // leave some margin
      const simNodes = nodes.map((n) => {
        const theta = Math.random() * Math.PI * 2;
        const r = R * Math.sqrt(Math.random());
        return {
          id: n.id,
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta),
          vx: 0,
          vy: 0,
        };
      });
      const links = safeEdges.map((e) => ({
        source: e.source,
        target: e.target,
        w: Math.max(0, Math.min(1, (e.data?.impact ?? 0) / 10)),
      }));
      // -------- Force-directed preset (good at de-overlap) --------
      const LINK_DIST_BASE = 250;
      const LINK_DIST_MIN = 180;
      const LINK_STRENGTH_MIN = 0.03;
      const LINK_STRENGTH_MAX = 0.16;
      const CHARGE_BASE = -200;
      const CHARGE_HUB_BONUS = -40; // extra repulsion per degree
      const COLLIDE = 0.9; // * nodeRadius
      const AXIS_PULL = 0.01; // tiny bias to center lines
      const LINK_ITER = 2;
      const TICKS = 220;

      const fx = forceX(width / 2).strength(AXIS_PULL);
      const fy = forceY(height / 2).strength(AXIS_PULL);

      const link = forceLink(links)
        .id((d) => d.id)
        .distance((l) => {
          const d =
            LINK_DIST_BASE - (LINK_DIST_BASE - LINK_DIST_MIN) * (l.w || 0);
          return d + (Math.random() - 0.5) * 6; // tiny jitter reduces overlap
        })
        .strength(
          (l) =>
            LINK_STRENGTH_MIN +
            (LINK_STRENGTH_MAX - LINK_STRENGTH_MIN) * (l.w || 0)
        )
        .iterations(LINK_ITER);

      const charge = forceManyBody().strength((n) => {
        const d = deg.get(n.id) || 0;
        return CHARGE_BASE + CHARGE_HUB_BONUS * Math.min(d, 8);
      });

      const collide = forceCollide((n) => nodeRadius(n.id) * COLLIDE);

      const sim = forceSimulation(simNodes)
        .force("link", link)
        .force("charge", charge)
        .force("collide", collide)
        .force("x", fx)
        .force("y", fy)
        .force("center", forceCenter(width / 2, height / 2))
        .alphaDecay(0.022)
        .velocityDecay(0.35)
        .stop();

      for (let i = 0; i < TICKS; i++) sim.tick();

      const byId = new Map(simNodes.map((d) => [d.id, d]));
      setNodes((nds) =>
        nds.map((n) => {
          const d = byId.get(n.id);
          return d ? { ...n, position: { x: d.x, y: d.y } } : n;
        })
      );
      setEdges(() => separateParallelEdges(sanitizeEdges(nodes, safeEdges)));
      requestAnimationFrame(() => fitView({ padding: 1, duration: 300 }));
    },
    [nodes, edges, setNodes, setEdges, wrapperRef]
  );

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const handleNodeLabelChange = useCallback(
    (id, value) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: value,
                  onChange: handleNodeLabelChange,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onChange: handleNodeLabelChange },
      }))
    );
  }, []);

  const getId = () => {
    const numericIds = nodesRef.current
      .map((n) => parseInt(n.id, 10))
      .filter((n) => !isNaN(n));
    const maxId = numericIds.length ? Math.max(...numericIds) : 0;
    return String(maxId + 1);
  };

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const withNew = addEdge(
          {
            ...params,
            type: "floating",
            data: { label: "", impact: 0, control: 0 },
          },
          eds
        );
        const cleaned = sanitizeEdges(nodes, withNew);
        return separateParallelEdges(cleaned);
      }),
    [setEdges, nodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: {
          label: `variable name`,
          onChange: handleNodeLabelChange, // Inject handler here
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes, handleNodeLabelChange]
  );

  return (
    <div className="flex" style={{ height: "100%" }}>
      <div className="w-15 bg-gray-100 p-4">
        <Sidebar />
      </div>

      <div ref={wrapperRef} className="relative flex-1">
        {/* Top-right controls */}
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 10 }}>
          <button
            onClick={() => runLayout("force")}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Rearrange
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineComponent={CustomConnectionLine}
          connectionLineStyle={connectionLineStyle}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          {showLoops && <LoopOverlay nodes={nodes} edges={edges} />}
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default CLD;
