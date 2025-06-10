import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  MarkerType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

export default function CLD() {
  const [nodes, setNodes] = useState([
    {
      id: '1',
      position: { x: 250, y: 5 },
      data: { label: 'Node 1' },
      type: 'default',
    },
  ]);

  const [edges, setEdges] = useState([]);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)
      ),
    []
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex' }}>
      <div style={{ width: '200px', background: '#eee', padding: '1rem' }}>
        Sidebar
      </div>
      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          fitView
          style={{ height: '100%', width: '100%' }}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
