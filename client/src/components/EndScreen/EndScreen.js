import React from 'react';

const EndScreen = ({ players, onNewGame }) => {
    const winner = players[0].score > players[1].score ? 1 : (players[1].score > players[0].score ? 2 : 0);

    const handleNewGameClick = () => {
        // First call the original onNewGame handler to clean up game state
        onNewGame();
        // Then force a complete reset of the application state
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
                {winner === 0 && (
                    <p className="text-lg">It's a tie!</p>
                )}
                {winner !== 0 && (
                    <p className="text-lg">Player {winner} Wins!</p>
                )}
                <div className="mt-4">
                    <p>Player 1 Score: {players[0].score}</p>
                    <p>Player 2 Score: {players[1].score}</p>
                </div>
                <button
                    className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                    onClick={handleNewGameClick}
                >
                    New Game
                </button>
            </div>
        </div>
    );
};

export default EndScreen;