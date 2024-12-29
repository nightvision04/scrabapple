import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Tile from '../Tile/Tile';

const Board = ({ board, onTileClick, isCurrentPlayerTurn, currentPlayer }) => {
    const handleTileClick = (rowIndex, colIndex) => {
        if (!isCurrentPlayerTurn) return;
        const cell = board[rowIndex][colIndex];
        if (cell.tile && !cell.original) {
            const tile = cell.tile;
            onTileClick(rowIndex, colIndex, { ...tile, originalTileValue: tile });
        } else if (!cell.tile) {
            onTileClick(rowIndex, colIndex, null);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="aspect-square w-full">
                <div role="grid" className="grid grid-cols-15 gap-1 h-full w-full bg-amber-900 p-2 rounded-lg shadow-lg">
                    {board.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <Droppable
                                droppableId={`cell-${rowIndex}-${colIndex}`}
                                key={`${rowIndex}-${colIndex}`}
                            >
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        onClick={() => handleTileClick(rowIndex, colIndex)}
                                        className={`
                                            aspect-square flex items-center justify-center
                                            p-0.5 rounded cursor-pointer
                                            ${getBonusClassName(cell.bonus)}
                                        `}
                                        data-testid={`cell-${rowIndex}-${colIndex}`}
                                        role="gridcell"
                                        ref={provided.innerRef}
                                    >
                                        {/* Only render Tile if cell.tile is not null */}
                                        {cell.tile && (
                                            <Tile
                                                value={cell.tile}
                                                isSelected={false}
                                            />
                                        )}
                                        {/* Render other content (bonus, center star) */}
                                        {!cell.tile && (
                                            <>
                                                {rowIndex === 7 && colIndex === 7 && (
                                                    <span className="bg-pink-300 text-pink-900 hover:bg-pink-200 text-[8px]">★</span>
                                                )}
                                                {cell.bonus && !cell.tile && (
                                                    <div className="text-[8px] leading-none text-center font-medium">
                                                        {getBonusText(cell.bonus)}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        ))
                    ))}
                </div>
            </div>
        </div>
    );
};

const getBonusClassName = (bonus) => {
    switch (bonus) {
        case 'tw':
            return 'bg-rose-600 text-white hover:bg-rose-500';
        case 'dw':
            return 'bg-pink-300 text-pink-900 hover:bg-pink-200';
        case 'tl':
            return 'bg-blue-500 text-white hover:bg-blue-400';
        case 'dl':
            return 'bg-blue-200 text-blue-900 hover:bg-blue-100';
        default:
            return 'bg-[#e9dcc9] hover:bg-amber-100';
    }
};

const getBonusText = (bonus) => {
    switch (bonus) {
        case 'tw':
            return 'TW';
        case 'dw':
            return 'DW';
        case 'tl':
            return 'TL';
        case 'dl':
            return 'DL';
        default:
            return '';
    }
};

export default Board;