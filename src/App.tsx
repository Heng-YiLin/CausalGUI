import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { initialNodes, nodeTypes } from "./nodes";
import { initialEdges, edgeTypes } from "./edges";

const getInitialNodes = () => {
  const stored = localStorage.getItem("cld-nodes");
  return stored ? JSON.parse(stored) : initialNodes;
};




export default function App() {
  const [nodes, , onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges]
  );

  const downloadNodesAsJSON = () => {
    const dataStr = JSON.stringify(nodes, null, 2); // Pretty-print with indentation
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "nodes.json";
    a.click();
  
    URL.revokeObjectURL(url);
  };
  
  useEffect(() => {
    localStorage.setItem("cld-nodes", JSON.stringify(nodes));
  }, [nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      edges={edges}
      edgeTypes={edgeTypes}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
     <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}
