'use client';

import { useState, useEffect } from 'react';
import { Activity, MemoryStick, Clock, Zap } from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  responseTime: number;
  apiCalls: number;
  lastUpdate: Date;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/health');
        const healthHeader = response.headers.get('X-Health-Status');
        const result = await response.json();

        if (result?.success && result?.data) {
          const memoryComponent = result.data.components?.find(
            (c: any) => c.component === 'memory'
          );

          // Prefer measured duration from server if available; otherwise approximate
          const responseTime =
            (result.data.metrics && result.data.metrics.responseTime) ||
            result.data.responseTime ||
            0;

          setMetrics({
            memoryUsage: memoryComponent?.metrics?.usagePercent || 0,
            responseTime,
            apiCalls: result.data.requests || 0,
            lastUpdate: new Date(),
          });
        } else {
          // Silently ignore unhealthy/degraded fetches to avoid console noise
          // We still update lastUpdate to reflect polling activity
          setMetrics(prev =>
            prev
              ? { ...prev, lastUpdate: new Date() }
              : {
                  memoryUsage: 0,
                  responseTime: 0,
                  apiCalls: 0,
                  lastUpdate: new Date(),
                }
          );
        }
      } catch (error) {
        // Avoid noisy warnings; just keep previous metrics
        setMetrics(prev =>
          prev
            ? { ...prev, lastUpdate: new Date() }
            : {
                memoryUsage: 0,
                responseTime: 0,
                apiCalls: 0,
                lastUpdate: new Date(),
              }
        );
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!metrics || !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-full transition-colors"
        title="Show Performance Monitor"
      >
        <Activity className="h-4 w-4" />
      </button>
    );
  }

  const getMemoryColor = (usage: number) => {
    if (usage < 50) return 'text-green-400';
    if (usage < 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryBgColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500/20';
    if (usage < 75) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          Performance
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white/60 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white/80">
            <MemoryStick className="h-3 w-3 mr-1" />
            Memory
          </div>
          <span className={getMemoryColor(metrics.memoryUsage)}>
            {metrics.memoryUsage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${getMemoryBgColor(metrics.memoryUsage)}`}
            style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-white/80">
            <Clock className="h-3 w-3 mr-1" />
            Response
          </div>
          <span className="text-blue-400">{metrics.responseTime}ms</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-white/80">
            <Zap className="h-3 w-3 mr-1" />
            API Calls
          </div>
          <span className="text-purple-400">{metrics.apiCalls}</span>
        </div>

        <div className="text-white/60 text-[10px] pt-1 border-t border-white/10">
          Updated: {metrics.lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
