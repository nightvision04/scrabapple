// --- File: Rack.js ---
import React from "react";
import { Droppable } from "react-beautiful-dnd";
import Tile from '../Tile/Tile';

const Rack = ({ rack, onTileClick, selectedTile }) => {
  return (
    <Droppable droppableId="rack" direction="horizontal">
      {(provided) => (
        <div className="relative" role="list">
          <div className="absolute inset-0 bg-amber-950 rounded transform translate-y-1 blur-sm opacity-20"></div>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="relative flex items-center gap-1 p-2 mt-3 bg-gradient-to-b from-amber-600 to-amber-700 rounded min-h-[50px]"
          >
            <div className="absolute top-2 left-2 right-2 h-8 bg-amber-900/20 rounded"></div>

            <div className="absolute inset-0 bg-opacity-10 bg-gradient-to-r from-amber-950/10 via-transparent to-amber-950/10 rounded"></div>

            <div className="absolute top-0 left-1 right-1 h-px bg-amber-500/30 rounded-full"></div>

            <div className="absolute bottom-0 left-1 right-1 h-px bg-amber-950/30 rounded-full"></div>

            <div className="relative flex gap-1 z-10">
              {rack &&
                rack.map((tile, index) => {
                  const draggableId = `tile-${index}`;
                  const isSelected =
                    selectedTile &&
                    selectedTile.tile === tile &&
                    selectedTile.from.type === "rack" &&
                    selectedTile.from.index === index;

                  return (
                    <div
                      key={index}
                      onClick={() => onTileClick(tile, index)}
                      className={`relative cursor-pointer ${
                        isSelected ? "transform -translate-y-1" : ""
                      }`}
                    >
                      <div className="absolute inset-0 bg-amber-950/20 rounded"></div>

                      <div className="relative">
                        <Tile
                          draggableId={draggableId}
                          index={index}
                          value={tile}
                          isSelected={isSelected}
                        />
                      </div>
                    </div>
                  );
                })}
              {provided.placeholder}
            </div>
          </div>
        </div>
      )}
    </Droppable>
  );
};

export default Rack;