'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const HISTORY_KEY = 'verus_nav_history';
const MAX_HISTORY_LENGTH = 50;

interface NavigationHistory {
  stack: string[];
  timestamp: number;
}

/**
 * Custom hook for tracking navigation history within the app
 * Uses sessionStorage to persist history across page refreshes
 * Provides smart fallback navigation based on page type
 */
export function useNavigationHistory() {
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Get navigation history from sessionStorage
   */
  const getHistory = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = sessionStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      
      const data: NavigationHistory = JSON.parse(stored);
      // Clear history if it's older than 24 hours
      const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        sessionStorage.removeItem(HISTORY_KEY);
        return [];
      }
      
      const history = data.stack || [];
      
      
      return history;
    } catch (error) {
      console.error('Error reading navigation history:', error);
      return [];
    }
  }, []);

  /**
   * Save navigation history to sessionStorage
   */
  const saveHistory = useCallback((stack: string[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Clean up the stack - remove duplicates and limit size
      const cleanedStack = stack.filter((path, index) => {
        // Remove duplicates (keep only the last occurrence)
        return stack.lastIndexOf(path) === index;
      });
      
      // Keep only the last MAX_HISTORY_LENGTH entries
      const trimmedStack = cleanedStack.slice(-MAX_HISTORY_LENGTH);
      const data: NavigationHistory = {
        stack: trimmedStack,
        timestamp: Date.now(),
      };
      
      // Use a more robust saving approach
      const jsonData = JSON.stringify(data);
      sessionStorage.setItem(HISTORY_KEY, jsonData);
      
      // Verify the save worked
      const verification = sessionStorage.getItem(HISTORY_KEY);
      if (verification !== jsonData) {
        console.warn('Navigation history save verification failed');
      }
      
    } catch (error) {
      console.error('Error saving navigation history:', error);
    }
  }, []);

  /**
   * Track current page visit in history
   */
  useEffect(() => {
    if (!pathname) return;

    const history = getHistory();
    const lastPath = history[history.length - 1];
    
    // Include search params in the path for proper tracking
    const fullPath = pathname + (window.location.search || '');

    // Only add to history if it's a different path
    if (lastPath !== fullPath) {
      const newHistory = [...history, fullPath];
      saveHistory(newHistory);
      
    }
  }, [pathname, getHistory, saveHistory]);

  // Initialize navigation history on first load
  useEffect(() => {
    const history = getHistory();
    if (history.length === 0) {
      const initialPath = pathname + (window.location.search || '');
      saveHistory([initialPath]);
    }
  }, [pathname, getHistory, saveHistory]);

  // Listen for navigation events and track them
  useEffect(() => {
    const handleNavigation = () => {
      const currentPath = pathname + (window.location.search || '');
      const history = getHistory();
      const lastPath = history[history.length - 1];
      
      if (lastPath !== currentPath) {
        const newHistory = [...history, currentPath];
        saveHistory(newHistory);
      }
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleNavigation);
    
    // Also listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(handleNavigation, 100); // Increased timeout for better reliability
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(handleNavigation, 100); // Increased timeout for better reliability
    };

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [pathname, getHistory, saveHistory]);

  /**
   * Determine smart fallback path based on current page type
   */
  const getSmartFallback = useCallback((currentPath: string): string => {
    // Block detail pages → dashboard (as per original plan)
    if (currentPath.startsWith('/block/')) {
      return '/';
    }
    
    // Transaction detail pages → dashboard (as per original plan)
    if (currentPath.startsWith('/transaction/')) {
      return '/';
    }
    
    // VerusID detail pages → VerusID list
    if (currentPath.startsWith('/verusid/') && currentPath !== '/verusid') {
      return '/verusid';
    }
    
    // Default fallback to homepage
    return '/';
  }, []);

  /**
   * Normalize a path by removing the domain
   */
  const normalizePath = useCallback((path: string): string => {
    try {
      const url = new URL(path, window.location.origin);
      return url.pathname + url.search;
    } catch {
      // If it's not a full URL, return as is
      return path;
    }
  }, []);

  /**
   * Navigate back with smart fallback
   */
  const goBack = useCallback((customFallback?: string) => {
    const currentPath = pathname || '/';
    
    // Simple logic: if we're on a block detail page, go to explorer tab
    if (currentPath.startsWith('/block/')) {
      router.push('/?tab=explorer');
      return;
    }
    
    // If we're on a transaction detail page, go to explorer tab
    if (currentPath.startsWith('/transaction/')) {
      router.push('/?tab=explorer');
      return;
    }
    
    // If we're on a VerusID detail page, go to VerusID tab
    if (currentPath.startsWith('/verusid/') && currentPath !== '/verusid') {
      router.push('/?tab=verusids');
      return;
    }
    
    // For everything else, use custom fallback or go to main page
    const fallbackPath = customFallback || '/';
    router.push(fallbackPath);
  }, [pathname, router]);

  /**
   * Check if there's a valid back path in history
   */
  const canGoBack = useCallback((): boolean => {
    const history = getHistory();
    const currentPath = pathname || '/';
    const currentFullPath = currentPath + (window.location.search || '');
    
    // Clean up history - remove duplicates and current page
    const cleanedHistory = history.filter((path, index) => {
      const normalizedPath = normalizePath(path);
      const normalizedCurrentPath = normalizePath(currentFullPath);
      
      // Remove current page (compare normalized paths)
      if (normalizedPath === normalizedCurrentPath) return false;
      // Remove duplicates (keep only the last occurrence)
      return history.lastIndexOf(path) === index;
    });
    
    // Check if there's a previous page that's different from current
    const previousPath = cleanedHistory[cleanedHistory.length - 1];
    return !!previousPath && normalizePath(previousPath) !== normalizePath(currentFullPath);
  }, [pathname, getHistory, normalizePath]);

  /**
   * Get the path we would navigate back to
   */
  const getBackPath = useCallback((): string => {
    const currentPath = pathname || '/';
    
    // Simple logic: if we're on a block detail page, go to explorer tab
    if (currentPath.startsWith('/block/')) {
      return '/?tab=explorer';
    }
    
    // If we're on a transaction detail page, go to explorer tab
    if (currentPath.startsWith('/transaction/')) {
      return '/?tab=explorer';
    }
    
    // If we're on a VerusID detail page, go to VerusID tab
    if (currentPath.startsWith('/verusid/') && currentPath !== '/verusid') {
      return '/?tab=verusids';
    }
    
    // For everything else, go to main page
    return '/';
  }, [pathname]);

  /**
   * Clear navigation history
   */
  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(HISTORY_KEY);
  }, []);

  /**
   * Manually add a path to navigation history
   * Useful for programmatic navigation
   */
  const addToHistory = useCallback((path: string) => {
    const history = getHistory();
    const lastPath = history[history.length - 1];
    
    if (lastPath !== path) {
      const newHistory = [...history, path];
      saveHistory(newHistory);
      
    }
  }, [getHistory, saveHistory]);

  /**
   * Initialize navigation history with a default path
   * Useful when there's no history but we want to provide a fallback
   */
  const initializeHistory = useCallback((defaultPath: string = '/') => {
    const history = getHistory();
    if (history.length === 0) {
      saveHistory([defaultPath]);
    }
  }, [getHistory, saveHistory]);

  return {
    goBack,
    canGoBack,
    getBackPath,
    clearHistory,
    addToHistory,
    initializeHistory,
    history: getHistory(),
  };
}

