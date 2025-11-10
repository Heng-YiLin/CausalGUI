import React from 'react';
import { Panel, useReactFlow, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { ImageDown } from "lucide-react";

/**
 * Downloads the CLD image
 */
function downloadImage(dataUrl) {
  const a = document.createElement('a');
  a.setAttribute('download', 'reactflow.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

function DownloadButton() {
  const { getNodes, getNodesBounds, getEdges, getZoom } = useReactFlow();

  const onClick = async () => {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);
    const edges = getEdges(); // To consider the edges too
    const padding = 40;

    // Add padding to the calculated bounds
    const dynamicWidth = bounds.width + padding * 2;
    const dynamicHeight = bounds.height + padding * 2;

    // Ensure we get all visible nodes and edges (including zoom/pan)
    const zoom = getZoom();
    const viewport = getViewportForBounds(bounds, dynamicWidth, dynamicHeight, 0, 0.5);

    const viewportEl = document.querySelector('.react-flow__viewport');
    if (viewportEl) {
      viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
    }

    // Hide background dots before screenshot
    const bg = document.querySelector('.react-flow__background');
    const originalDisplay = bg?.style.display;
    if (bg) bg.style.display = 'none';

    // Ensure to include any edges that might go beyond the node bounds
    try {
      const dataUrl = await toPng(document.querySelector('.react-flow'), {
        backgroundColor: 'white',
        width: dynamicWidth,
        height: dynamicHeight,
        style: {
          width: `${dynamicWidth}px`,
          height: `${dynamicHeight}px`,
        },
        filter: (node) => node?.style?.display !== 'none', // Avoid hidden nodes
      });

      downloadImage(dataUrl);
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      if (bg) bg.style.display = originalDisplay ?? '';
    }
  };

  return (
    <button
      style={{ marginTop: '1rem' }}
      onClick={onClick}
    >
      <ImageDown style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
    </button>
  );
}

export default DownloadButton;
