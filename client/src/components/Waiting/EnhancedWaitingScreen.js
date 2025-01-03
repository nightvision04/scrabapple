import React, { useState } from 'react';
import { FaLink } from 'react-icons/fa';

const EnhancedWaiting = ({ onlinePlayers = 0, averageWaitTime = 0 }) => {
  const [copied, setCopied] = useState(false);
  const siteUrl = 'https://scrabapple.ca';

  const formatWaitTime = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full mt-7 bg-amber-50 flex flex-col">
      <div className="flex flex-col items-center pt-6 pb-6">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-amber-900"></div>
        <p className="mt-10 text-lg text-amber-900">Waiting for another player...</p>

        <div className="mt-8 space-y-2 text-center">
          <p className="text-sm text-amber-800">
            Players Online: <span className="font-semibold">{onlinePlayers}</span>
          </p>
          <p className="text-sm text-amber-800">
            Average Wait Time: <span className="font-semibold">{averageWaitTime ? formatWaitTime(averageWaitTime) : 'N/A'}</span>
          </p>
        
          <div className="pt-8 pb-3 bg-amber-50 flex flex-col gap-2 sm:flex-row w-full items-center justify-center">
            <input
              type="text"
              value={siteUrl}
              readOnly
              className="px-4 py-2 rounded-lg border-2 border-amber-200 focus:outline-none w-full sm:w-auto text-sm"
            />
            <button
              onClick={handleCopy}
              className="whitespace-nowrap w-full sm:w-auto px-6 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center"
            >
              <FaLink className="inline-block mr-2" />
              {copied ? 'Copied!' : 'Share Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWaiting;