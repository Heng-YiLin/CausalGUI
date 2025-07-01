export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const radius = Math.sqrt(dx * dx + dy * dy); // You can also use a fixed value like 150

  const sweepFlag = dx * dy > 0 ? 1 : 0; // Optional: flips arc direction depending on drag direction

  const arcPath = `M ${fromX} ${fromY} A ${radius} ${radius} 0 0 ${sweepFlag} ${toX} ${toY}`;

  return (
    <path
      d={arcPath}
      stroke="#b1b1b7"
      strokeWidth={2}
      fill="none"
      markerEnd="url(#arrowhead)"
    />
  );
}
