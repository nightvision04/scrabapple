import React from 'react';

const GameControls = ({ onPlay, onExchange, onPass, onShuffle }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4 p-4">
      <button 
        onClick={onPlay}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Play Word
      </button>
      <button 
        onClick={onExchange}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Exchange
      </button>
      <button 
        onClick={onPass}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
      >
        Pass
      </button>
      <button 
        onClick={onShuffle}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Shuffle Rack
      </button>
    </div>
  );
};

export default GameControls;