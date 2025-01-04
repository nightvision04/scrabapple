import React from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { FaAngleDoubleRight } from "react-icons/fa";
import { FaSyncAlt } from "react-icons/fa";
import ChatComponent from "../Chat/Chat";

const GameControls = ({
  onPlay,
  onExchange,
  onPass,
  onShuffle,
  disablePlay,
  disableExchangePass,
  socketRef,
  gameId,
  playerId
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center -mt-2 p-4">
      <button
        onClick={onPlay}
        className={`border-2 border-[#b795e1] px-3 py-2 bg-[#d9bcfc] text-black rounded-lg transition-colors active:bg-[#FDC5E4] ${
          disablePlay ? "bg-[#e1c8ff] cursor-not-allowed" : "hover:bg-[#e1c8ff]"
        }`}
        disabled={disablePlay}
      >
        Play Word
      </button>
      <button
        onClick={onExchange}
        className={`border-2 border-[#b795e1] px-3 py-2 bg-[#d9bcfc] text-black rounded-lg transition-colors active:bg-[#FDC5E4] ${
          disableExchangePass ? "bg-[#e1c8ff] cursor-not-allowed" : "hover:bg-[#e1c8ff]"
        }`}
        disabled={disableExchangePass}
      >
        <FaExchangeAlt className="inline-block" />
      </button>
      <button
        onClick={onPass}
        className={`border-2 border-[#b795e1] px-3 py-2 bg-[#d9bcfc] text-black rounded-lg transition-colors active:bg-[#FDC5E4] ${
          disableExchangePass ? "bg-[#e1c8ff] cursor-not-allowed" : "hover:bg-[#e1c8ff]"
        }`}
        disabled={disableExchangePass}
      >
        <FaAngleDoubleRight className="inline-block" />
      </button>
      {/* Remove the disabling condition for the shuffle button */}
      <button
        onClick={onShuffle}
        className="border-2 border-[#b795e1] px-3 py-2 bg-[#d9bcfc] text-black rounded-lg transition-colors active:bg-[#FDC5E4] hover:bg-[#e1c8ff]"
      >
        <FaSyncAlt className="inline-block" />
      </button>

      <ChatComponent 
                          socket={socketRef.current} 
                          gameId={gameId} 
                          playerId={playerId}
                      />
    </div>
  );
};

export default GameControls;