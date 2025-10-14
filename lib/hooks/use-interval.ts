'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

export function useSmartInterval(
  callback: () => void | Promise<void>,
  delay: number,
  options: {
    immediate?: boolean;
    pauseOnError?: boolean;
    maxRetries?: number;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    immediate = false,
    pauseOnError = true,
    maxRetries = 3,
    onError,
  } = options;

  const savedCallback = useRef(callback);
  const retryCountRef = useRef(0);
  const isPausedRef = useRef(false);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const executeCallback = useCallback(async () => {
    if (isPausedRef.current) {
      return;
    }

    try {
      await savedCallback.current();
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      const err = error as Error;
      retryCountRef.current += 1;

      onError?.(err);

      if (pauseOnError && retryCountRef.current >= maxRetries) {
        isPausedRef.current = true;
        console.warn(
          `Smart interval paused after ${maxRetries} consecutive errors`
        );
      }
    }
  }, [pauseOnError, maxRetries, onError]);

  // Set up the interval
  useEffect(() => {
    if (immediate) {
      executeCallback();
    }

    const id = setInterval(executeCallback, delay);
    return () => clearInterval(id);
  }, [delay, immediate, executeCallback]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    isPausedRef.current = false;
  }, []);

  return {
    pause,
    resume,
    reset,
    isPaused: isPausedRef.current,
    retryCount: retryCountRef.current,
  };
}
