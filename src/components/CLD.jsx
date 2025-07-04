import React, { useEffect, useCallback, useRef } from "react";

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
import DownloadButton from './DownloadButton';

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
  const savedNodes = localStorage.getItem("savedNodes");
  const savedEdges = localStorage.getItem("savedEdges");

  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const handleNodeLabelChange = useCallback((id, value) => {
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
  }, []);
  const initialNodes = savedNodes
    ? JSON.parse(savedNodes)
    : [
        {
          id: "1",
          type: "custom",
          data: { label: "Node 1" },
          position: { x: 0, y: 0 },
        },
        {
          id: "2",
          type: "custom",
          data: { label: "Node 2" },
          position: { x: 250, y: 320 },
        },
      ];
  const injectOnChange = useCallback(
    (nodes, handler) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onChange: handler,
        },
      })),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    injectOnChange(initialNodes, handleNodeLabelChange)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    savedEdges ? JSON.parse(savedEdges) : initialEdges
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "floating", // Ensure floating edge is used
            data: { label: "" }, // Default label (can be '-', '' etc.)
          },
          eds
        )
      ),
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
        data: {
          label: `variable name`,
          onChange: handleNodeLabelChange, // Inject handler here
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes]
  );

  useEffect(() => {
    localStorage.setItem("savedNodes", JSON.stringify(nodes));
  }, [nodes]);
  useEffect(() => {
    localStorage.setItem("savedEdges", JSON.stringify(edges));
  }, [edges]);
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
