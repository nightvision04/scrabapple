import { useRef, useEffect } from 'react';

export const useAudio = (url) => {
  const audio = useRef(new Audio(url)).current;
  return audio;
};

export const playAudio = (audio) => {
  audio.currentTime = 0;
  audio.play().catch(error => {
    console.error("Error playing audio:", error);
  });
};

export const useAudioPlayers = () => {
  const tapSelectAudio = useAudio('/tap-select.mp3');
  const tapPlaceAudio = useAudio('/tap-place.mp3');
  const endTurnAudio = useAudio('/stars.mp3');
  const endGameAudio = useAudio('/end-game.mp3');
  const messageRecieveAudio = useAudio('/message-recieve.mp3');

  return { tapSelectAudio, tapPlaceAudio, endTurnAudio, endGameAudio, messageRecieveAudio };
};