import React from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { FaAngleDoubleRight } from "react-icons/fa";
import { FaSyncAlt } from "react-icons/fa";

const GameControls = ({
  onPlay,
  onExchange,
  onPass,
  onShuffle,
  disablePlay,
  disableExchangePass,
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center -mt-2 p-4">
      <button
        onClick={onPlay}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors active:bg-blue-500 ${
          disablePlay
            ? "bg-blue-400 cursor-not-allowed"
            : "hover:bg-blue-700"
        }`}
        disabled={disablePlay}
      >
        Play Word
      </button>
      <button
        onClick={onExchange}
        className={`px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors active:bg-amber-800 ${
          disableExchangePass
            ? "bg-amber-400 cursor-not-allowed"
            : "hover:bg-amber-700"
        }`}
        disabled={disableExchangePass}
      >
        <FaExchangeAlt className="inline-block" />
      </button>
      <button
        onClick={onPass}
        className={`px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors active:bg-amber-800 ${
          disableExchangePass
            ? "bg-amber-400 cursor-not-allowed"
            : "hover:bg-amber-700"
        }`}
        disabled={disableExchangePass}
      >
        <FaAngleDoubleRight className="inline-block" />
      </button>
      <button
        onClick={onShuffle}
        className="px-4 py-2 bg-amber-900 text-white rounded-lg transition-colors active:bg-amber-800 hover:bg-amber-700"
      >
        <FaSyncAlt className="inline-block" />
      </button>
    </div>
  );
};

export default GameControls;