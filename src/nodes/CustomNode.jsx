import { Handle, Position, useConnection } from "@xyflow/react";

export default function CustomNode({ id, data }) {
  const connection = useConnection();

  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  const label = isTarget ? "Drop here" : "Drag to connect";

  return (
    <div className="customNode" >
      <div
        className="customNodeBody"
       
      >
        {!connection.inProgress && (
          <Handle
            className="customHandle"
            position={Position.Right}
            type="source"
          />
        )}
        {(!connection.inProgress || isTarget) && (
          <Handle
            className="customHandle"
            position={Position.Left}
            type="target"
            isConnectableStart={false}
          />
        )}

        {/* Centered input field */}
        <div style={{ zIndex: 1 }}>
          <input
            id={`input-${id}`}
            name="text"
            onChange={(e) => data?.onChange?.(id, e.target.value)}
            className="nodrag"
            style={{
              fontSize: 12,
              padding: "2px 4px",
              borderRadius: 4,
              textAlign: "center",
              alignItems: "center",
              borderWidth: 1,
            }}
            value={data?.label || ""}
          />
        </div>
      </div>
    </div>
  );
}
