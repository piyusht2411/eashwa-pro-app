// hooks/useCountdown.ts
import { useState, useEffect } from 'react';

export function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isEnding, setIsEnding] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = endTime.getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsEnding(false);
        setIsEnded(true);
        clearInterval(timer);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
      setIsEnding(diff < 5 * 60 * 1000); // Less than 5 minutes
      setIsEnded(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const formattedTime = `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;

  return { timeLeft: formattedTime, isEnding, isEnded };
}