import React from 'react';

const Scoreboard = ({ players, currentPlayer }) => {
    return (
        <div className="flex justify-center gap-8 p-4 mb-4 bg-white rounded-lg shadow">
            {players.map((player, index) => (
                <div 
                    key={index} 
                    className={`
                        px-4 py-2 rounded
                        ${index === currentPlayer ? 'bg-amber-100 border-2 border-amber-500' : ''}
                    `}
                >
                    <span className="font-bold text-lg">Player {index + 1}:</span>
                    <span className="ml-2 text-lg">{player.score}</span>
                </div>
            ))}
        </div>
    );
};

export default Scoreboard;