import React from "react";
import { Droppable } from "react-beautiful-dnd";
import Tile from "../Tile/Tile";

const Board = ({
  board,
  onTileClick,
  isCurrentPlayerTurn,
  currentPlayer,
  lastPlayedTiles,
  secondToLastPlayedTiles
}) => {
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

  const isTilePlayedThisTurn = (rowIndex, colIndex, board) => {
    const cell = board[rowIndex][colIndex];
    
    // If there are no lastPlayedTiles, then any non-original tile was placed this turn
    if (lastPlayedTiles.length === 0) {
      return cell && cell.tile && !cell.original;
    }

    // Otherwise, check if the tile is not original and not from last turn
    return cell && cell.tile && !cell.original && 
           !lastPlayedTiles.some(lt => lt.row === rowIndex && lt.col === colIndex);
  };

  const isTilePlayedLastTurn = (rowIndex, colIndex, lastPlayedTiles) => {
    return lastPlayedTiles.some(lt => lt.row === rowIndex && lt.col === colIndex);
  };

  return (
    <div className="w-full max-w-4xl sm:max-w-[620px] mx-auto p-0 -mb-3 mt-0">
      <div className="aspect-square w-full">
        <div
          role="grid"
          className="grid grid-cols-15 gap-[2px] h-full w-full bg-[#EFE1F5] p-2 rounded-lg shadow-lg"
        >
          {board.map((row, rowIndex) =>
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
                        p-[0px] rounded cursor-pointer
                        ${getBonusClassName(cell.bonus)}
                    `}
                    data-testid={`cell-${rowIndex}-${colIndex}`}
                    role="gridcell"
                    ref={provided.innerRef}
                  >
                    {cell.tile && (
                      <Tile 
                        value={(isCurrentPlayerTurn || cell.original) ? cell.tile : "?"}
                        isSelected={false}
                        className={
                          isTilePlayedThisTurn(rowIndex, colIndex, board) ? 'bg-gradient-to-br from-[#F0FCF8] to-[#7EFFF4] text-black shadow-lg border-[#00B5C2] border-[2px]' : 
                          isTilePlayedLastTurn(rowIndex, colIndex, lastPlayedTiles) ? 'bg-gradient-to-br from-[#FDECF5] to-[#FAA0EB] text-black shadow-lg' : ''
                        }
                      />
                    )}
                    {!cell.tile && (
                      <>
                        {rowIndex === 7 && colIndex === 7 && (
                          <span className=" text-pink-900 text-[12px]">
                            ★
                          </span>
                        )}
                        {cell.bonus && !cell.tile && (
                          <div className="text-[12px] leading-none text-center font-medium">
                            {!(rowIndex === 7 && colIndex === 7) &&
                              getBonusText(cell.bonus)}
                          </div>
                        )}
                      </>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const getBonusClassName = (bonus) => {
  switch (bonus) {
    case "tw":
      return "bg-[#D9BCFC] text-black cursor-default";
    case "dw":
      return "bg-[#FDC5E4] text-black-900 cursor-default";
    case "tl":
      return "bg-[#C3E9F6] text-black-900 cursor-default";
    case "dl":
      return "bg-[#D8FBEC] text-black-900 cursor-default";
    default:
      return "bg-[#FEFAE4] cursor-default";
  }
};

const getBonusText = (bonus) => {
  switch (bonus) {
    case "tw":
      return "TW";
    case "dw":
      return "DW";
    case "tl":
      return "TL";
    case "dl":
      return "DL";
    default:
      return "";
  }
};

export default Board;