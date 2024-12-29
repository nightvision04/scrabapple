import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Tile from '../Tile/Tile';
import './Rack.css';

function Rack({ rack, onTileClick, selectedTile }) {
  return (
    <Droppable droppableId="rack" direction="horizontal">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} role="list" className="rack">
          {rack.map((tile, index) => {
            const draggableId = `tile-${index}`;
        
            return (
              <Tile
                key={index}
                draggableId={draggableId}
                index={index}
                value={tile}
                isSelected={selectedTile && selectedTile.tile === tile && selectedTile.from.type === 'rack' && selectedTile.from.index === index}
                onTileClick={() => onTileClick(tile, index)}
              />
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default Rack;