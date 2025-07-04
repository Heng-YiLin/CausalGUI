import React from 'react';
import { Panel, useReactFlow, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';

function downloadImage(dataUrl) {
  const a = document.createElement('a');
  a.setAttribute('download', 'reactflow.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

function DownloadButton() {
  const { getNodes, getNodesBounds } = useReactFlow();

  const onClick = async () => {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);
    const padding = 40;
  
    const dynamicWidth = bounds.width + padding * 2;
    const dynamicHeight = bounds.height + padding * 2;
  
    const viewport = getViewportForBounds(bounds, dynamicWidth, dynamicHeight, 0, 1);
  
    const viewportEl = document.querySelector('.react-flow__viewport');
    if (viewportEl) {
      viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
    }
  
    // Hide background dots before screenshot
    const bg = document.querySelector('.react-flow__background');
    const originalDisplay = bg?.style.display;
    if (bg) bg.style.display = 'none';
  
    // Take the PNG
    try {
      const dataUrl = await toPng(document.querySelector('.react-flow'), {
        backgroundColor: '#1a365d',
        width: dynamicWidth,
        height: dynamicHeight,
        style: {
          width: `${dynamicWidth}px`,
          height: `${dynamicHeight}px`,
        },
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
    Download Image
  </button>
  );
}

export default DownloadButton;
