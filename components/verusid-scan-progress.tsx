'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  Zap,
  Clock,
} from 'lucide-react';

interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  stakesFound: number;
  blocksScanned: number;
  totalBlocks: number;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

interface VerusIDScanProgressProps {
  verusidName: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function VerusIDScanProgress({
  verusidName,
  onComplete,
  onError,
}: VerusIDScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgress>({
    status: 'idle',
    progress: 0,
    currentStep: 'Initializing...',
    stakesFound: 0,
    blocksScanned: 0,
    totalBlocks: 0,
    startTime: null,
    estimatedTimeRemaining: null,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Start the scan
  const startScan = async () => {
    try {
      setIsScanning(true);
      setProgress(prev => ({ ...prev, status: 'scanning' }));

      const response = await fetch('/api/verusid/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verusidName }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        setProgress(prev => ({ ...prev, status: 'complete', progress: 100 }));
        onComplete?.(data.result);
      } else {
        throw new Error(data.error || 'Scan failed');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        currentStep: `Error: ${error.message}`,
      }));
      onError?.(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Poll for progress updates (if we implement real-time progress)
  useEffect(() => {
    if (!isScanning || progress.status !== 'scanning') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/verusid/scan/progress');
        const data = await response.json();

        if (data.success) {
          setProgress(data.progress);
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [isScanning, progress.status]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'scanning':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'scanning':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>Scanning {verusidName}</span>
          <Badge className={`${getStatusColor()} text-white`}>
            {progress.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progress.currentStep}</span>
            <span>{progress.progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress.progress} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {progress.stakesFound}
            </div>
            <div className="text-sm text-gray-600">Stakes Found</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {progress.blocksScanned.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Blocks Scanned</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {progress.totalBlocks.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Blocks</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(progress.estimatedTimeRemaining)}
            </div>
            <div className="text-sm text-gray-600">Time Remaining</div>
          </div>
        </div>

        {/* Action Button */}
        {!isScanning && progress.status === 'idle' && (
          <button
            onClick={startScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="h-5 w-5" />
            Start Scan
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              Scan Complete!
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Stakes Found:</span>{' '}
                {result.stakes}
              </div>
              <div>
                <span className="font-medium">UTXOs Updated:</span>{' '}
                {result.utxos}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {result.duration}
                s
              </div>
              <div>
                <span className="font-medium">Blocks Scanned:</span>{' '}
                {result.blocksScanned.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {progress.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Scan Failed</h3>
            <p className="text-red-700">{progress.currentStep}</p>
            <button
              onClick={startScan}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Retry Scan
            </button>
          </div>
        )}

        {/* Scanning Status */}
        {isScanning && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Scanning in progress...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
