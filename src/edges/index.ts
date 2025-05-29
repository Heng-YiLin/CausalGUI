import type { Edge, EdgeTypes } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

export const initialEdges: Edge[] = [
  {
    id: "1->3",
    source: "1",
    target: "3",
    type: "custom",
    data: { label: "+" },
    markerEnd: {
      type: MarkerType.Arrow,
    },
  },
  {
    id: "2->4",
    source: "2",
    target: "4",
    type: "custom",
    data: { label: "-" },
    markerEnd: {
      type: MarkerType.Arrow,
    },
  },
  {
    id: "3->4",
    source: "3",
    target: "4",
    type: "custom",
    data: { label: "-" },
    markerEnd: {
      type: MarkerType.Arrow,
    },
  },
];

export const edgeTypes = {
  // Add your custom edge types here!
} satisfies EdgeTypes;
