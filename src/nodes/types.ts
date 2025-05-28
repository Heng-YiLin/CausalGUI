import type { Node, BuiltInNode } from '@xyflow/react';

export type PositionLoggerNode = Node<{
  onChange: any; label: string 
}, 'position-logger'>;
export type AppNode = BuiltInNode | PositionLoggerNode;
