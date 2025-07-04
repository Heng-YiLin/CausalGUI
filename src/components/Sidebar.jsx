import React, { DragEvent } from 'react';
import { useDnD } from './DnDContext';
import DownloadButton from './DownloadButton';

const DnDComponent = () => {
  const [_, setType] = useDnD();

  // Create a handler that returns the actual drag handler
  const handleDragStart = (nodeType) => (event) => {
    event.dataTransfer.setData('text/plain', nodeType); 
    event.dataTransfer.effectAllowed = 'move';
    setType(nodeType);
    console.log('Drag started with type:', nodeType);
  };

  return (
    <aside>
      <div
        className="dndnode input"
        onDragStart={handleDragStart('custom')}
        draggable
      >
        Add Node
      </div>
      <div>
      <DownloadButton />

      </div>

   
    </aside>
  );
};

export default DnDComponent;
