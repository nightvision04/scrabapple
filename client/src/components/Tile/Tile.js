import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { LETTER_VALUES } from '../../constants';

const Tile = ({ value, isSelected, onTileClick, draggableId, index }) => {
  const tileContent = (
    <div
      className={`
        w-full h-full
        bg-gradient-to-br from-[#f4e4bc] to-[#ecd29b]
        border-2 border-[#8B4513]
        flex items-center justify-center
        rounded-sm cursor-pointer
        shadow-[2px_2px_3px_rgba(0,0,0,0.3),inset_1px_1px_2px_rgba(255,255,255,0.5)]
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        hover:brightness-105 transition-all
        transform hover:-translate-y-0.5
      `}
      onClick={() => onTileClick?.()}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-lg md:text-xl font-bold text-[#5c3928] select-none">
          {value}
        </span>
        {LETTER_VALUES[value] > 0 && (
          <span className="absolute bottom-0.5 right-1 text-[10px] md:text-xs font-bold text-[#5c3928]">
            {LETTER_VALUES[value]}
          </span>
        )}
      </div>
    </div>
  );

  if (draggableId) {
    return (
      <Draggable draggableId={draggableId} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="aspect-square p-0.5"
          >
            {tileContent}
          </div>
        )}
      </Draggable>
    );
  }

  return (
    <div className="aspect-square p-0.5">
      {tileContent}
    </div>
  );
};

export default Tile;