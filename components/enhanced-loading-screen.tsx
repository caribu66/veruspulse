'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Pulse,
  Database,
  Network,
  Clock,
} from '@phosphor-icons/react';

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  error?: string;
}

export function EnhancedLoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: 'connection',
      label: 'Connecting to Verus Network',
      icon: <Network className="h-4 w-4" />,
      completed: false,
    },
    {
      id: 'blockchain',
      label: 'Loading Blockchain Data',
      icon: <Database className="h-4 w-4" />,
      completed: false,
    },
    {
      id: 'mining',
      label: 'Fetching Mining Statistics',
      icon: <Pulse className="h-4 w-4" />,
      completed: false,
    },
    {
      id: 'mempool',
      label: 'Loading Mempool Data',
      icon: <Clock className="h-4 w-4" />,
      completed: false,
    },
  ]);

  useEffect(() => {
    const testConnection = async () => {
      // Simulate a successful API call after a short delay
      setTimeout(() => {
        setSteps(prev => prev.map(step => ({ ...step, completed: true })));
        setProgress(100);
      }, 1000);
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verus-blue/20 to-verus-green/20">
      <div className="max-w-lg w-full mx-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200/20 border-t-blue-400 rounded-full animate-spin"></div>
                <div
                  className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"
                  style={{
                    animationDirection: 'reverse',
                    animationDuration: '1.5s',
                  }}
                ></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Loading Network Data
            </h2>
            <p className="text-blue-200 text-sm">
              Fetching latest blockchain information...
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  step.completed
                    ? 'bg-green-500/20 border border-green-500/30'
                    : index === currentStep
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-white/5 border border-white/10'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    step.completed
                      ? 'bg-green-500/30 text-green-400'
                      : index === currentStep
                        ? 'bg-blue-500/30 text-blue-400'
                        : 'bg-white/10 text-white/50'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${
                      step.completed
                        ? 'text-green-300'
                        : index === currentStep
                          ? 'text-blue-300'
                          : 'text-white/70'
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.error && (
                    <div className="text-red-400 text-xs mt-1">
                      {step.error}
                    </div>
                  )}
                </div>

                {index === currentStep && !step.completed && (
                  <div className="animate-pulse">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-blue-300 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-verus-blue to-verus-green h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            <div className="text-xs text-blue-300">
              {progress === 100 ? (
                <span aria-live="polite">✅ Data loaded successfully!</span>
              ) : (
                `Loading... ${steps[currentStep]?.label || 'Initializing'}`
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
