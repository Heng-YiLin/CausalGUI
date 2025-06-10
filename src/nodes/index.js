
import { PositionLoggerNode } from './PositionLoggerNode';

export const initialNodes = [
  { id: '1', type: 'position-logger', position: { x: 0, y: 0 }, data: { label: 'wire', onChange: () => {} } },
  {
    id: '2',
    type: 'position-logger',
    position: { x: -100, y: 100 },
    data: { label: 'drag me!', onChange: () => {} },
    draggable: true,
  },
  { id: '3', type: 'position-logger', position: { x: 100, y: 100 }, data: { label: 'test1', onChange: () => {} } },
  {
    id: '4',
    type: 'output',
    position: { x: 0, y: 200 },
    data: { label: 'with dsadasd Flow' },
    draggable: true,

  },
];

export const nodeTypes = {
  'position-logger': PositionLoggerNode,
};
