'use client';

import { useCallback, useRef } from 'react';

export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      // Check if we're in the browser
      if (typeof document === 'undefined') {
        return;
      }

      // Remove existing announcement
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
      }

      // Create new announcement element
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;

      // Add to DOM
      document.body.appendChild(announcement);
      announcementRef.current = announcement;

      // Remove after announcement
      setTimeout(() => {
        if (
          announcementRef.current &&
          document.body.contains(announcementRef.current)
        ) {
          document.body.removeChild(announcementRef.current);
          announcementRef.current = null;
        }
      }, 1000);
    },
    []
  );

  const announceError = useCallback(
    (message: string) => {
      announce(`Error: ${message}`, 'assertive');
    },
    [announce]
  );

  const announceSuccess = useCallback(
    (message: string) => {
      announce(`Success: ${message}`, 'polite');
    },
    [announce]
  );

  const announceInfo = useCallback(
    (message: string) => {
      announce(`Info: ${message}`, 'polite');
    },
    [announce]
  );

  return {
    announce,
    announceError,
    announceSuccess,
    announceInfo,
  };
}
