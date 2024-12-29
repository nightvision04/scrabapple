// File: components/Effects/YourTurnEffect.js
import React, { useState, useEffect } from 'react';

const YourTurnEffect = ({ isCurrentPlayerTurn }) => {
    const [audio] = useState(new Audio('/your-turn.mp3'));

    useEffect(() => {
        if (isCurrentPlayerTurn) {
            audio.play().catch(error => {
                console.error("Error playing audio:", error);
            });
        }
    }, [isCurrentPlayerTurn, audio]);

    return null; // No visual output
};

export default YourTurnEffect;