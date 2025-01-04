import React, { useState, useEffect } from "react";

const Timer = ({ 
  duration,
  handleTurnTimeout,
  isPaused,
  gameId,
  board,
  players,
  currentPlayer,
  setBoard,
  setPlayers,
  setSelectedTile,
  setPotentialScore,
  socket,
  setTurnTimerKey,
  gameStarted,
  playerId
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(duration);
  const isCurrentPlayerTurn = players[currentPlayer]?.playerId === playerId;

  useEffect(() => {
    setSecondsRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (isPaused || !gameStarted) return;

    const timerId = setInterval(() => {
      setSecondsRemaining(prevSeconds => {
        const newSeconds = prevSeconds <= 1 ? 0 : prevSeconds - 1;
        
        if (newSeconds === 0) {
          clearInterval(timerId);
          handleTurnTimeout(
            gameId,
            board,
            players,
            currentPlayer,
            setBoard,
            setPlayers,
            setSelectedTile,
            setPotentialScore,
            socket,
            setTurnTimerKey,
            gameStarted,
            playerId
          );
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [
    isPaused,
    gameStarted,
    handleTurnTimeout,
    gameId,
    board,
    players,
    currentPlayer,
    setBoard,
    setPlayers,
    setSelectedTile,
    setPotentialScore,
    socket,
    setTurnTimerKey,
    playerId,
    isCurrentPlayerTurn
  ]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const getTimerColor = () => {
    if (!isCurrentPlayerTurn) return "text-gray-400";
    if (secondsRemaining <= 30) return "text-red-500";
    return "text-black";
  };

return (
    <div className="absolute top-2 right-5 flex flex-col items-center">
        <span className="text-[10px] w-[60px] text-gray-600">Turn Time</span>
        <span className={`text-xs ${getTimerColor()}`}>
            {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
        </span>
    </div>
);
};

export default Timer;