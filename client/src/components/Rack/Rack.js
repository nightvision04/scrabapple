import React from 'react';
import Tile from '../Tile/Tile';
import './Rack.css';

function Rack({ rack, onTileClick, selectedTile }) {
  return (
    <div role="list" className="rack"> 
      {rack.map((tile, index) => (
        <div role="listitem" key={index}>
            <Tile
            key={index}
            value={tile}
            isSelected={selectedTile && selectedTile.tile === tile && selectedTile.from.type === 'rack' && selectedTile.from.index === index}
            onTileClick={() => onTileClick(tile, index)}
            />
        </div>
      ))}
    </div>
  );
}

export default Rack;