import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 3-minute countdown matching the backend's OTP_SESSION_TTL_MS
 * (src/domain/entities/otp.types.ts on the server). If that value
 * ever changes server-side, update OTP_DURATION_SECONDS here to match —
 * this is the one place the frontend timer length is defined.
 */
export const OTP_DURATION_SECONDS = 30; // 30 seconds, mirrors server's OTP_SESSION_TTL_MS

interface UseOtpTimerResult {
  /** Seconds remaining, counting down from OTP_DURATION_SECONDS to 0. */
  secondsLeft: number;
  /** Formatted as "M:SS" for direct display, e.g. "2:45". */
  formatted: string;
  /** True once secondsLeft hits 0 — the session has expired and a fresh OTP is required. */
  expired: boolean;
  /** Restarts the countdown from OTP_DURATION_SECONDS. Call this right after a successful resend. */
  reset: () => void;
}

export function useOtpTimer(): UseOtpTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearExistingInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startInterval = useCallback(() => {
    clearExistingInterval();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearExistingInterval();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startInterval();
    return clearExistingInterval;
  }, [startInterval]);

  const reset = useCallback(() => {
    setSecondsLeft(OTP_DURATION_SECONDS);
    startInterval();
  }, [startInterval]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { secondsLeft, formatted, expired: secondsLeft === 0, reset };
}
