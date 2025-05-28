import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import type { PositionLoggerNode as PositionLoggerNodeData } from './types';

interface PositionLoggerNodeProps extends NodeProps<PositionLoggerNodeData> {}

export function PositionLoggerNode({
  id,
  positionAbsoluteX,
  positionAbsoluteY,
  data,
}: PositionLoggerNodeProps) {
  const x = `${Math.round(positionAbsoluteX)}px`;
  const y = `${Math.round(positionAbsoluteY)}px`;

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (data.onChange) {
        data.onChange(id, event.target.value);
      }
    },
    [id, data]
  );

  return (
    <div className="react-flow__node-default p-2 border rounded shadow bg-white">
      <input
        className="nodrag border p-1 rounded w-full mb-2"
        value={data.label ?? ''}
        onChange={onChange}
        placeholder="Enter label"
      />

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
