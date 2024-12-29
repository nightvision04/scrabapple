import React, { useState, useEffect } from 'react';

const TurnEffects = ({ isCurrentPlayerTurn }) => {
  const [audio] = useState(new Audio('/stars.mp3'));

  useEffect(() => {
    // Play the sound only when it's the beginning of a player's turn
    if (isCurrentPlayerTurn) {
      audio.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    }
  }, [isCurrentPlayerTurn, audio]);

  return null; 
};

export default TurnEffects;