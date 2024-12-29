import React from 'react';
import { FaExchangeAlt } from 'react-icons/fa';
import { FaAngleDoubleRight } from 'react-icons/fa';
import { FaSyncAlt } from 'react-icons/fa';

const GameControls = ({ onPlay, onExchange, onPass, onShuffle, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center -mt-2 p-4">
      <button
        onClick={onPlay}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
          disabled ? 'bg-blue-400 cursor-not-allowed' : 'hover:bg-blue-700'
        }`}
        disabled={disabled}
      >
        Play Word
      </button>
      <button
        onClick={onExchange}
        className={`px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors ${
          disabled ? 'bg-amber-400 cursor-not-allowed' : 'hover:bg-amber-700'
        }`}
        disabled={disabled}
      >
        <FaExchangeAlt className="inline-block" />
      </button>
      <button
        onClick={onPass}
        className={`px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors ${
          disabled ? 'bg-amber-400 cursor-not-allowed' : 'hover:bg-amber-700'
        }`}
        disabled={disabled}
      >
        <FaAngleDoubleRight className="inline-block" />
      </button>
      <button
        onClick={onShuffle}
        className={`px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors ${
          disabled ? 'bg-amber-400 cursor-not-allowed' : 'hover:bg-amber-700'
        }`}
        disabled={disabled}
      >
        <FaSyncAlt className="inline-block" />
      </button>
    </div>
  );
};

export default GameControls;