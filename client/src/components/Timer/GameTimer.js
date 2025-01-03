import React, { useState, useEffect } from "react";

const GameTimer = ({ duration, onTimeout, isPaused }) => {
    const [secondsRemaining, setSecondsRemaining] = useState(duration);
  
    useEffect(() => {
      setSecondsRemaining(duration);
    }, [duration]);
  
    useEffect(() => {
      if (isPaused) return;
  
      if (secondsRemaining === 0) {
        onTimeout();
        return;
      }
  
      const timerId = setInterval(() => {
        setSecondsRemaining(prevSeconds => prevSeconds - 1);
      }, 1000);
  
      return () => clearInterval(timerId);
    }, [secondsRemaining, onTimeout, isPaused]);
  
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
  
    return (
        <div className="absolute top-2 left-3 flex flex-col items-center">
            <span className="text-[10px] w-[60px] text-gray-600">Game Time</span>
            <span className="text-xs text-blue-800">
                {minutes.toString().padStart(2, "0")}:
                {seconds.toString().padStart(2, "0")}
            </span>
        </div>
    );
};

export default GameTimer;