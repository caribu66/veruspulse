'use client';

import { useEffect, useState } from 'react';

interface HealthScoreGaugeProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function HealthScoreGauge({
  score,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  className = '',
}: HealthScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const center = size / 2;

  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3165d4'; // Verus blue
    if (score >= 40) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const color = getColor(animatedScore);
  const grade = getGrade(animatedScore);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color}40)`,
          }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold" style={{ color }}>
            {Math.round(animatedScore)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Grade {grade}</div>
        </div>
      )}
    </div>
  );
}
