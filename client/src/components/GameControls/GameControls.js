import React from 'react';

const GameControls = ({ onPlay, onExchange, onPass, onShuffle, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4 p-4">
      <button
        onClick={onPlay}
        className={`px-4 py-2 bg-green-600 text-white rounded-lg transition-colors ${
          disabled ? 'bg-green-400 cursor-not-allowed' : 'hover:bg-green-700'
        }`}
        disabled={disabled}
      >
        Play Word
      </button>
      <button
        onClick={onExchange}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
          disabled ? 'bg-blue-400 cursor-not-allowed' : 'hover:bg-blue-700'
        }`}
        disabled={disabled}
      >
        Exchange
      </button>
      <button
        onClick={onPass}
        className={`px-4 py-2 bg-yellow-600 text-white rounded-lg transition-colors ${
          disabled ? 'bg-yellow-400 cursor-not-allowed' : 'hover:bg-yellow-700'
        }`}
        disabled={disabled}
      >
        Pass
      </button>
      <button
        onClick={onShuffle}
        className={`px-4 py-2 bg-purple-600 text-white rounded-lg transition-colors ${
          disabled ? 'bg-purple-400 cursor-not-allowed' : 'hover:bg-purple-700'
        }`}
        disabled={disabled}
      >
        Shuffle Rack
      </button>
    </div>
  );
};

export default GameControls;