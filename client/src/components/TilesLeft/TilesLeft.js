import React, { useState, useEffect } from 'react';

const TilesLeft = ({ board, players, gameStarted }) => {
    const [tilesLeft, setTilesLeft] = useState(0);

    const calculateTilesLeft = () => {
        const totalTiles = 98;
        let tilesOnBoard = 0;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j].tile) {
                    tilesOnBoard++;
                }
            }
        }
        const tilesInPlayer1Rack = players[0].rack.length;
        const tilesInPlayer2Rack = players[1].rack.length;

        const remainingTiles = totalTiles - tilesOnBoard - tilesInPlayer1Rack - tilesInPlayer2Rack;
        setTilesLeft(remainingTiles);
    };

    useEffect(() => {
        if (gameStarted) {
            calculateTilesLeft();
        }
    }, [board, players, gameStarted]);

    return (
        <span>Tiles Left: {tilesLeft}</span>
    );
};

export default TilesLeft;