import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { initialNodes, nodeTypes } from "../nodes";
import { initialEdges } from "../edges";
import { useDnD } from "./DnDContext";
import Sidebar from "./Sidebar";
import CustomEdge from "../edges/CustomEdge";

import "./CLDTheme.css";

export default function CLD() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const handleNodeLabelChange = useCallback((id: string, value: string) => {
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

  const getInitialNodes = useCallback(() => {
    const stored = localStorage.getItem("cld-nodes");
    const parsed = stored ? JSON.parse(stored) : initialNodes;

    return parsed.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        onChange: handleNodeLabelChange,
      },
    }));
  }, [handleNodeLabelChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const edgeTypes = {
    custom: CustomEdge,
  };

  const getId = (existingNodes: any[]) => {
    const maxId =
      existingNodes.length > 0
        ? Math.max(...existingNodes.map((node) => parseInt(node.id, 10)))
        : 0;
    return (maxId + 1).toString();
  };

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges]
  );

  const onDragOver = useCallback(
    (event: {
      preventDefault: () => void;
      dataTransfer: { dropEffect: string };
    }) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    []
  );

  const onDrop = useCallback(
    (event: {
      preventDefault: () => void;
      dataTransfer: { getData: (arg0: string) => any };
      clientX: any;
      clientY: any;
    }) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("text/plain");

      if (!nodeType) {
        console.warn("❌ No node type found in dataTransfer");
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(nodes),
        type: nodeType,
        position,
        data: {
          label: `${type} node`,
          onChange: handleNodeLabelChange,
        },
      };

      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        localStorage.setItem("cld-nodes", JSON.stringify(updatedNodes));
        return updatedNodes;
      });
    },
    [screenToFlowPosition, type, nodes, handleNodeLabelChange]
  );

  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      setEdges(deleted.reduce((acc, node) => acc, edges));
    },
    [edges]
  );

  useEffect(() => {
    localStorage.setItem("cld-nodes", JSON.stringify(nodes));
  }, [nodes]);

  return (
    <div className="flex" style={{ height: "100%" }}>
      <div className="w-20 bg-gray-100 p-4">
        <Sidebar />
      </div>

      <div style={{ height: "90%", flexGrow: 1 }} className=".react-flow"ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
