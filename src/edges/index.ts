import type { Edge, EdgeTypes } from '@xyflow/react';

export const initialEdges: Edge[] = [
  { id: '1->3', source: '1', target: '3', animated: true },
  { id: '2->4', source: '2', target: '4' },
  { id: '3->4', source: '3', target: '4', animated: true },
];

export const edgeTypes = {
  // Add your custom edge types here!
} satisfies EdgeTypes;
