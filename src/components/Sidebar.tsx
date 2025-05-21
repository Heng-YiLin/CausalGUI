import React, { DragEvent } from 'react';
import { useDnD } from './DnDContext';

const DnDComponent: React.FC = () => {
  const [_, setType] = useDnD();

  // Create a handler that returns the actual drag handler
  const handleDragStart = (nodeType: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', nodeType); 
    event.dataTransfer.effectAllowed = 'move';
    setType(nodeType);
    console.log('Drag started with type:', nodeType);
  };

  return (
    <aside>
      <div
        className="dndnode input"
        onDragStart={handleDragStart('position-logger')}
        draggable
      >
        Input Node
      </div>

      <div
        className="dndnode position-logger"
        onDragStart={handleDragStart('position-logger')}
        draggable
      >
        Position Logger Node
      </div>
    </aside>
  );
};

export default DnDComponent;
