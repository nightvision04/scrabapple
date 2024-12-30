import React, { forwardRef } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { LETTER_VALUES } from '../../constants';

const Tile = forwardRef(({ value, isSelected, onTileClick, draggableId, index, className = '' }, ref) => {
    const tileContent = (
        <div className={`w-full h-full rounded-sm ${className}`}>
            <div
                className={`
                    w-full h-full
                    flex items-center justify-center
                    rounded-sm cursor-pointer
                    shadow-[2px_2px_3px_rgba(0,0,0,0.3)]
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    hover:brightness-105 transition-all
                    transform hover:-translate-y-0.5
                    ${!className ? 'bg-gradient-to-br from-[#f4e4bc] to-[#ecd29b]' : ''}
                `}
                onClick={() => onTileClick?.()}
            >
                <div className="relative w-[14px] h-[14px] flex items-center justify-center right-[1px] top-[1px] m-1">
                    <span className="text-lg md:text-xl font-bold select-none">
                        {value}
                    </span>
                    {value !== '_' && LETTER_VALUES[value] > 0 && (
                        <span className="absolute top-1.5 left-[12px] text-[8px] font-bold">
                            {LETTER_VALUES[value]}
                        </span>
                    )}
                </div>
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
                        {React.cloneElement(tileContent, { ref })}
                    </div>
                )}
            </Draggable>
        );
    }

    return tileContent;
});

export default Tile;