import { useState, useEffect } from 'react';

export const useSound = (src: string) => {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    setAudio(audio);
  }, [src]);

  const play = () => {
    if (audio) {
      audio.play();
    }
  };

  return { play };
};