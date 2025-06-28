import { Handle, Position, useConnection } from "@xyflow/react";

export default function CustomNode({ id, data }) {
  const connection = useConnection();

  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  const label = isTarget ? "Drop here" : "Drag to connect";

  return (
    <div className="customNode" >
      <div className="customNodeBody" >
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
            value={data?.label || ""}
            style={{
              fontSize: 12,
              border: "1px solid #aaa",
              borderRadius: 15,
              background: "white",
              textAlign: "center",
              padding: 0, // no horizontal padding
              margin: 0,
              width: "auto",
              minWidth: "1ch",
              borderWidth: 1,
            }}
            size={(data?.label || "").length || 1}
          />
        </div>
      </div>
    </div>
  );
}
