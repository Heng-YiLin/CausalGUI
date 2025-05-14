import { useCallback, useEffect} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";


const getInitialNodes = () => {
  const stored = localStorage.getItem("cld-nodes");
  return stored ? JSON.parse(stored) : initialNodes;
};

export default function DDM() {


  return (
    <div style={{ height: "90%" }}>
      <p>test</p> 
    </div>
  );
}
