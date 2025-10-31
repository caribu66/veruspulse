'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  format?: 'number' | 'currency' | 'percentage';
}

export function AnimatedCounter({
  value,
  duration = 2000,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
  format = 'number',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min(
        (timestamp - startTimeRef.current) / duration,
        1
      );

      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const currentValue =
        startValueRef.current + (value - startValueRef.current) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatValue = (val: number): string => {
    let formatted = val.toFixed(decimals);

    if (format === 'number' && val >= 1000) {
      // Add thousand separators
      formatted = parseFloat(formatted).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } else if (format === 'currency') {
      formatted = parseFloat(formatted).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } else if (format === 'percentage') {
      formatted = parseFloat(formatted).toFixed(decimals);
    }

    return formatted;
  };

  return (
    <span className={`${className} ${isAnimating ? 'animating' : ''}`}>
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}
