import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCallback } from "react";
import type { PositionLoggerNode as PositionLoggerNodeData } from "./types";

interface PositionLoggerNodeProps extends NodeProps<PositionLoggerNodeData> {}

export function PositionLoggerNode({ id, data }: PositionLoggerNodeProps) {
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (data.onChange) {
        data.onChange(id, event.target.value);
      }
    },
    [id, data]
  );

  return (
    <div className=" rounded flex justify-center">
      <Handle
        type="target"
        position={Position.Top}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          background: "transparent",
          border: "none",
          zIndex: 10,
        }}
        isConnectable={true}
      />
      <input
        style={{ width: `${(data.label?.length ?? 1) + 1}ch` }}
        className="rounded w-full text-center"
        value={data.label ?? ""}
        onChange={onChange}
        placeholder="Enter Variable Name"
      />

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
