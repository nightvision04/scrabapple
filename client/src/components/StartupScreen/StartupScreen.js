import React, { useState, useEffect } from 'react';
import Logo from '../../images/scrabapple-logo.png';
import exampleImage from '../../images/example-game.png';

const StartupScreen = ({ onJoinGame, onPlayAsGuest }) => {
  const [playerName, setPlayerName] = useState('');
  const [isReturningPlayer, setIsReturningPlayer] = useState(false);

  useEffect(() => {
    const savedName = getCookie('player-name');
    if (savedName) {
      setPlayerName(savedName);
      setIsReturningPlayer(true);
    }
  }, []);

  const getCookie = (name) => {
    const cookieValue = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return cookieValue ? decodeURIComponent(cookieValue.pop()) : '';
  };

  const setCookie = (name, value) => {
    const encodedValue = encodeURIComponent(value);
    document.cookie = `${name}=${encodedValue};path=/;max-age=${30 * 24 * 60 * 60}`; // 30 days
  };

  const handleJoinGame = () => {
    if (playerName.trim()) {
      setCookie('player-name', playerName.trim());
      onJoinGame(playerName);
    }
  };

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div className="min-h-screen w-full bg-[#F5E6EB] flex flex-col items-center pt-8">
      <img
        src={Logo}
        alt="Scrabapple Logo"
        className="logo pb-8 max-w-[145px] sm:max-w-[220px]"
      />

      <div className="w-full max-w-md px-4">
        {isReturningPlayer && (
          <div className="text-center mb-6">
            <h2 className="text-xl text-amber-900 font-semibold">
              Welcome back, {capitalizeFirstLetter(playerName)}!
            </h2>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full sm:flex-grow px-4 py-2 rounded-lg border-2 border-amber-200 focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={handleJoinGame}
            className="whitespace-nowrap w-full sm:w-auto px-6 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            {isReturningPlayer ? 'Play Again' : 'Join Game'}
          </button>
        </div>

        <button
          onClick={() => {
            setCookie('player-name', 'Guest');
            onPlayAsGuest();
          }}
          className="w-full px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition-colors mb-8"
        >
          Play as Guest
        </button>

        <div className="text-center px-4">
            <h2 className="text-lg text-amber-900 font-semibold mb-3">How to Play:</h2>
          <p className="text-amber-900 text-sm leading-relaxed">
            Scrabapple is a word-building game (like Scrabble) where players take turns placing letters on the board
            to form interconnected words. Score points based on letter values and special board squares,
            aiming to create the highest-scoring combinations.
          </p>

          <p className="text-amber-900 text-sm leading-relaxed mt-5">
            When there are no tiles left, or the time limit is up, the player with the most points wins!
          </p>
        </div>
        <img src={exampleImage} alt="Example Game" className="w-full rounded-lg shadow-lg mt-4 mb-7" />
      </div>
      
    </div>
  );
};

export default StartupScreen;