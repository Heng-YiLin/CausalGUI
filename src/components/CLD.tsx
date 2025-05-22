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
import { initialEdges, edgeTypes } from "../edges";
import { useDnD, DnDProvider } from "./DnDContext";
import Sidebar from "./Sidebar";

const getInitialNodes = () => {

  const stored = localStorage.getItem("cld-nodes");
      console.log(stored);

  return stored ? JSON.parse(stored) : initialNodes;

};

export default function CLD() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges]
  );
  const getId = (existingNodes: any[]) => {
    // Get the max id from existing nodes (parse as integers), or start from 0 if none exist
    const maxId =
      existingNodes.length > 0
        ? Math.max(...existingNodes.map((node) => parseInt(node.id, 10)))
        : 0;
    return (maxId + 1).toString(); // Return the next ID as a string
  };

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
      dataTransfer: any;
      preventDefault: () => void;
      clientX: any;
      clientY: any;
    }) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("text/plain");

      console.log(nodeType);
      // check if the dropped element is valid
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
        data: { label: `${type} node` },
      };

      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        localStorage.setItem("cld-nodes", JSON.stringify(updatedNodes)); // Save to localStorage immediately
        return updatedNodes;
      });
    },
    [screenToFlowPosition, type, nodes]
  );

  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      setEdges(deleted.reduce((acc, node) => {}, edges));
    },
    [nodes, edges]
  );

  useEffect(() => {
    localStorage.setItem("cld-nodes", JSON.stringify(nodes));
  }, [nodes]);

  return (
    <div className="flex" style={{ height: "100%" }}>
      {/* Sidebar */}
      <div className="w-20 bg-gray-100 p-4">
        <Sidebar />
      </div>

      {/* ReactFlow */}
      <div style={{ height: "90%", flexGrow: 1 }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
