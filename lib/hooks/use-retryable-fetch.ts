'use client';

import { useState, useCallback, useRef } from 'react';

interface RetryableFetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface RetryableFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  lastFetch: number;
}

export function useRetryableFetch<T = any>() {
  const [state, setState] = useState<RetryableFetchState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastFetch: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWithRetry = useCallback(
    async (url: string, options: RetryableFetchOptions = {}): Promise<T> => {
      const {
        retries = 3,
        retryDelay = 1000,
        retryCondition = error => error.name !== 'AbortError',
        onRetry,
        onSuccess,
        onError,
        ...fetchOptions
      } = options;

      // Create new abort controller for this specific request
      const currentAbortController = new AbortController();
      abortControllerRef.current = currentAbortController;

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        lastFetch: Date.now(),
      }));

      let lastError: Error;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: currentAbortController.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          setState(prev => ({
            ...prev,
            data,
            loading: false,
            error: null,
            retryCount: attempt,
          }));

          onSuccess?.(data);
          return data;
        } catch (error) {
          lastError = error as Error;

          // Don't retry if request was aborted
          if (error instanceof Error && error.name === 'AbortError') {
            setState(prev => ({
              ...prev,
              loading: false,
            }));
            throw error; // Re-throw to maintain error handling
          }

          // Don't retry if condition is not met
          if (!retryCondition(lastError)) {
            break;
          }

          // Don't retry on last attempt
          if (attempt === retries) {
            break;
          }

          // Notify about retry
          onRetry?.(attempt + 1, lastError);

          // Wait before retrying
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }

      // All retries failed
      setState(prev => ({
        ...prev,
        loading: false,
        error: lastError!,
        retryCount: retries,
      }));

      onError?.(lastError!);
      throw lastError!;
    },
    []
  );

  const retry = useCallback(() => {
    if (state.error) {
      // This would need the original URL and options to be stored
      // For now, we'll just clear the error state
      setState(prev => ({
        ...prev,
        error: null,
        retryCount: 0,
      }));
    }
  }, [state.error]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({
      ...prev,
      loading: false,
    }));
  }, []);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
      lastFetch: 0,
    });
  }, []);

  return {
    ...state,
    fetchWithRetry,
    retry,
    cancel,
    clear,
  };
}

// Specialized hook for API endpoints
export function useApiFetch<T = any>(baseUrl: string = '') {
  const { fetchWithRetry, ...state } = useRetryableFetch<T>();

  const apiFetch = useCallback(
    async (
      endpoint: string,
      options: RetryableFetchOptions = {}
    ): Promise<T> => {
      const url = baseUrl + endpoint;
      return fetchWithRetry(url, {
        retries: 3,
        retryDelay: 1000,
        // Retry on network-level failures (TypeError/NetworkError) and server 5xx HTTP errors
        retryCondition: error => {
          if (!error) return false;
          const msg = String(error.message || '').toLowerCase();
          const isTypeError = (error as any)?.name === 'TypeError';
          const isNetwork = msg.includes('network') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error');
          const is5xx = /http\s*5\d{2}|\b500\b|\b502\b|\b503\b|\b504\b/.test(msg);
          return isTypeError || isNetwork || is5xx;
        },
        ...options,
      });
    },
    [baseUrl, fetchWithRetry]
  );

  return {
    ...state,
    apiFetch,
  };
}
