import React, { useEffect, useCallback, useRef } from "react";

import {
  Background,
  ReactFlow,
  addEdge,

  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import CustomNode from "../nodes/CustomNode";
import FloatingEdge from "../edges/FloatingEdge";
import CustomConnectionLine from "../edges/CustomConnectionLine";
import Sidebar from "./Sidebar";
import { useDnD } from "./DnDContext";

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

const CLD = ({ nodes, setNodes, edges, setEdges }) => {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

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

  const getId = () => {
    const numericIds = nodesRef.current
      .map((n) => parseInt(n.id, 10))
      .filter((n) => !isNaN(n));
    const maxId = numericIds.length ? Math.max(...numericIds) : 0;
    return String(maxId + 1);
  };

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "floating", // Ensure floating edge is used
            data: {
              label: "",
              impact: 0, 
              control: 0, 
            },
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
    [screenToFlowPosition, type, setNodes, handleNodeLabelChange]
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
