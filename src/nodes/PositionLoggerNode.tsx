import {
  Handle,
  Position,
  type NodeProps,
  useConnection,
} from "@xyflow/react";
import { useCallback } from "react";
import type { PositionLoggerNode as PositionLoggerNodeData } from "./types";

interface PositionLoggerNodeProps extends NodeProps<PositionLoggerNodeData> {}

export function PositionLoggerNode({
  id,
  data,
  isConnectable,
}: PositionLoggerNodeProps) {
  const connection = useConnection();
  const isConnecting = connection.inProgress;
  const isTarget = isConnecting && connection.fromNode.id !== id;

  const label = isTarget ? "Drop here" : "Drag to connect";

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (data.onChange) {
        data.onChange(id, event.target.value);
      }
    },
    [id, data]
  );

  return (
    <div
      style={{
        border: "1px solid #777",
        borderRadius: 6,
        padding: "1rem",
        background: "#fff",
        position: "relative",
        minWidth: 160,
        textAlign: "center",
      }}
    >
      {/* ✅ This small handle is where user must start dragging to connect */}
      {!isConnecting && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            background: "#555",
            width: 10,
            height: 10,
            borderRadius: "50%",
          }}
        />
      )}

      {(!isConnecting || isTarget) && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          isConnectableStart={false}
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            background: "#555",
            width: 10,
            height: 10,
            borderRadius: "50%",
          }}
        />
      )}

      {/* Only this area moves the node */}
      <div
        className="react-flow-drag-handle"
        style={{
          background: "#eee",
          padding: "0.25rem",
          borderRadius: "4px",
          marginBottom: "0.5rem",
          cursor: "grab",
        }}
      >
        ⠿ Drag
      </div>

      <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{label}</div>

      <input
        style={{
          width: `${(data.label?.length ?? 8) + 2}ch`,
          textAlign: "center",
          padding: "0.25rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
        value={data.label ?? ""}
        onChange={onChange}
        placeholder="Enter Variable Name"
      />
    </div>
  );
}
