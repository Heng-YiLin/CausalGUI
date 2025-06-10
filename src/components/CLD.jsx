import React, { useCallback, useRef } from "react";

import {
  Background,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import CustomNode from "../nodes/CustomNode";
import FloatingEdge from "../edges/FloatingEdge";
import CustomConnectionLine from "../edges/CustomConnectionLine";
import Sidebar from "./Sidebar";
import { useDnD } from "./DnDContext";

const initialNodes = [
  {
    id: "1",
    type: "custom",
    position: { x: 0, y: 0 },
  },
  {
    id: "2",
    type: "custom",
    position: { x: 250, y: 320 },
  },
  {
    id: "3",
    type: "custom",
    position: { x: 40, y: 300 },
  },
  {
    id: "4",
    type: "custom",
    position: { x: 300, y: 0 },
  },
];

const initialEdges = [];

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

let id = 5;
const getId = () => `node_${id++}`;

const CLD = () => {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes]
  );

  return (
    <div className="flex" style={{ height: "100%" }}>
      <div className="w-20 bg-gray-100 p-4">
        <Sidebar />
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
      >
        <Background />
      </ReactFlow>
    </div>
  );
};

export default CLD;
