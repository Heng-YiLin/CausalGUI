import { MarkerType } from "@xyflow/react";

export const initialEdges = [
  {
    id: "1->3",
    source: "1",
    target: "3",
    type: "floating",
    data: { label: "+" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: "2->4",
    source: "2",
    target: "4",
    type: "floating",
    data: { label: "-" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: "3->4",
    source: "3",
    target: "4",
    type: "floating",
    data: { label: "-" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
];

export const edgeTypes = {
  // Add your custom edge types here!
};
