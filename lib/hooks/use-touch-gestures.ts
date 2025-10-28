/**
 * Touch Gesture Hook
 * Provides swipe gesture detection for mobile navigation
 */

import { useState, useRef } from 'react';

export interface SwipeResult {
  isLeftSwipe: boolean;
  isRightSwipe: boolean;
  isUpSwipe: boolean;
  isDownSwipe: boolean;
  distance: number;
}

export function useTouchGestures(minSwipeDistance = 50) {
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null
  );

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = (): SwipeResult | null => {
    if (!touchStart || !touchEnd) return null;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    // Determine if horizontal or vertical swipe
    const isHorizontalSwipe = absDistanceX > absDistanceY;
    const isVerticalSwipe = absDistanceY > absDistanceX;

    const result: SwipeResult = {
      isLeftSwipe:
        isHorizontalSwipe && distanceX > minSwipeDistance ? true : false,
      isRightSwipe:
        isHorizontalSwipe && distanceX < -minSwipeDistance ? true : false,
      isUpSwipe: isVerticalSwipe && distanceY > minSwipeDistance ? true : false,
      isDownSwipe:
        isVerticalSwipe && distanceY < -minSwipeDistance ? true : false,
      distance: Math.max(absDistanceX, absDistanceY),
    };

    // Reset
    setTouchStart(null);
    setTouchEnd(null);

    return result;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    touchStart,
    touchEnd,
  };
}
