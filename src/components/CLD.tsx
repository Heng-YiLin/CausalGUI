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
  let id = 0;

  const getId = () => `dndnode_${id++}`;

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
      dataTransfer: any; preventDefault: () => void; clientX: any; clientY: any 
}) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('text/plain');

      console.log(nodeType);
      // check if the dropped element is valid
      if (!nodeType) {
            console.warn('❌ No node type found in dataTransfer');

        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type: nodeType,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type]
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

