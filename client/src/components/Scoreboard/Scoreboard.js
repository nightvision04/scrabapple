import React from 'react';

const Scoreboard = ({ players, currentPlayer, playerName }) => {
    return (
        <div className="flex justify-center gap-8 p-1 mb-2 bg-white rounded-lg shadow">
            {players.map((player, index) => (
                <div 
                    key={index} 
                    className={`
                        px-4 py-0 rounded
                        ${index === currentPlayer ? 'bg-amber-100 border-2 border-amber-500' : ''}
                    `}
                >
                    <span className="font-bold text-xs">
                        {index != currentPlayer ? playerName : `Player ${index + 1}`}:
                    </span>
                    <span className="ml-2 text-xs">{player.score}</span>
                </div>
            ))}
        </div>
    );
};

export default Scoreboard;