import React from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { FaAngleDoubleRight } from "react-icons/fa";
import { FaSyncAlt } from "react-icons/fa";
import { TbAppleFilled } from "react-icons/tb";

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
        className={`border-2 border-[#39b2db] px-4 py-2 bg-[#C3E9F6] text-black rounded-lg transition-colors active:bg-[#C3E9F6] ${
          disablePlay ? "bg-[#8fe2ff] cursor-not-allowed" : "hover:bg-[#8fe2ff]"
        }`}
        disabled={disablePlay}
      >
        Play Word
      </button>
      <button
        onClick={onExchange}
        className={`border-2 border-[#39b2db] px-4 py-2 bg-[#C3E9F6] text-black rounded-lg transition-colors active:bg-[#C3E9F6] ${
          disableExchangePass ? "bg-[#8fe2ff] cursor-not-allowed" : "hover:bg-[#8fe2ff]"
        }`}
        disabled={disableExchangePass}
      >
        <FaExchangeAlt className="inline-block" />
      </button>
      <button
        onClick={onPass}
        className={`border-2 border-[#39b2db] px-4 py-2 bg-[#C3E9F6] text-black rounded-lg transition-colors active:bg-[#C3E9F6] ${
          disableExchangePass ? "bg-[#8fe2ff] cursor-not-allowed" : "hover:bg-[#8fe2ff]"
        }`}
        disabled={disableExchangePass}
      >
        <FaAngleDoubleRight className="inline-block" />
      </button>
      {/* Remove the disabling condition for the shuffle button */}
      <button
        onClick={onShuffle}
        className="border-2 border-[#39b2db] px-4 py-2 bg-[#C3E9F6] text-black rounded-lg transition-colors active:bg-[#C3E9F6] hover:bg-[#8fe2ff]"
      >
        <FaSyncAlt className="inline-block" />
      </button>
    </div>
  );
};

export default GameControls;