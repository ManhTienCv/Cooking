import { useState, useEffect, useCallback } from 'react';

const TIMER_STORAGE_KEY = 'cook_checkout_deadline';
const DURATION_MINUTES = 20;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;

export function clearCheckoutTimer(): void {
  try {
    sessionStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resetCheckoutTimer(): number {
  const newDeadline = Date.now() + DURATION_MS;
  try {
    sessionStorage.setItem(TIMER_STORAGE_KEY, String(newDeadline));
  } catch {
    // ignore
  }
  return newDeadline;
}

export function useCheckoutTimer(onExpire?: () => void) {
  const [deadline, setDeadline] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return resetCheckoutTimer();
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setIsExpired(true);
        if (onExpire) {
          onExpire();
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const restart = useCallback(() => {
    const newDeadline = resetCheckoutTimer();
    setDeadline(newDeadline);
    setRemainingSeconds(DURATION_MINUTES * 60);
    setIsExpired(false);
  }, []);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / (DURATION_MINUTES * 60)) * 100));
  const isUrgent = remainingSeconds <= 5 * 60; // Dưới 5 phút

  return {
    remainingSeconds,
    formatted,
    minutes,
    seconds,
    isExpired,
    isUrgent,
    percentage,
    restart,
    clear: clearCheckoutTimer,
  };
}
