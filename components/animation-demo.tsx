'use client';

import { useState } from 'react';
import {
  Sparkles,
  Play,
  Settings,
  Zap,
  Shield,
  Hammer,
  X,
  Clock,
  Activity,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import {
  useNewBlockAnimations,
  createParticleEffects,
  animationPresets,
} from '@/lib/hooks/useNewBlockAnimations';
import './animations/new-block-animations.css';

// Mock block data for demo
const mockBlocks = [
  {
    hash: '00000000000068e8038e1234567890abcdef1234567890abcdef1234567890ab',
    height: 266463,
    time: Math.floor(Date.now() / 1000) - 30,
    size: 3072,
    nTx: 2,
    difficulty: 37293662680,
    blocktype: 'minted',
    validationtype: 'stake',
    reward: 24.0,
  },
  {
    hash: '0000000000004fd0d7ca1234567890abcdef1234567890abcdef1234567890ab',
    height: 266462,
    time: Math.floor(Date.now() / 1000) - 90,
    size: 8601,
    nTx: 7,
    difficulty: 37124979340,
    blocktype: 'minted',
    validationtype: 'pow',
    reward: 24.0,
  },
  {
    hash: 'cf817d4837f41af010551234567890abcdef1234567890abcdef1234567890ab',
    height: 266461,
    time: Math.floor(Date.now() / 1000) - 150,
    size: 2048,
    nTx: 2,
    difficulty: 35473002810,
    blocktype: 'minted',
    validationtype: 'stake',
    reward: 24.0,
  },
];

export function AnimationDemo() {
  const [selectedPreset, setSelectedPreset] =
    useState<keyof typeof animationPresets>('smooth');
  const [showControls, setShowControls] = useState(false);
  const [particles, setParticles] = useState(createParticleEffects());

  const { animationState, triggerNewBlockAnimation, dismissNotification } =
    useNewBlockAnimations({
      notificationDuration:
        animationPresets[selectedPreset].notificationDuration,
      particleDuration: 3000,
      onNewBlock: block => {
        console.log('New block detected:', block);
        // Regenerate particles for new animation
        setParticles(
          createParticleEffects(animationPresets[selectedPreset].particleCount)
        );
      },
    });

  const triggerDemo = () => {
    const newBlock = {
      ...mockBlocks[0],
      height: mockBlocks[0].height + 1,
      hash: `new${Math.random().toString(36).substring(7)}`,
      time: Math.floor(Date.now() / 1000),
    };
    triggerNewBlockAnimation(newBlock);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDifficulty = (difficulty: number) => {
    return (
      (difficulty / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' M'
    );
  };

  const getBlockTypeColor = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
    return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  };

  const getBlockTypeIcon = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return <Shield className="h-3 w-3" />;
    }
    return <Hammer className="h-3 w-3" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            New Block Animation Demo
          </h1>
          <p className="text-blue-200 text-lg">
            Experience different animation styles for new blockchain block
            arrivals
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Animation Controls
            </h2>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
            >
              <Settings className="h-5 w-5 text-blue-400" />
            </button>
          </div>

          {showControls && (
            <div className="space-y-4 animate-in slide-in-from-top duration-300">
              <div>
                <label className="text-blue-200 text-sm font-medium mb-2 block">
                  Animation Preset
                </label>
                <div className="flex space-x-2">
                  {Object.keys(animationPresets).map(preset => (
                    <button
                      key={preset}
                      onClick={() =>
                        setSelectedPreset(
                          preset as keyof typeof animationPresets
                        )
                      }
                      className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                        selectedPreset === preset
                          ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-blue-200">
                <div>
                  <span className="font-medium">Duration:</span>{' '}
                  {animationPresets[selectedPreset].slideInDuration}s
                </div>
                <div>
                  <span className="font-medium">Particles:</span>{' '}
                  {animationPresets[selectedPreset].particleCount}
                </div>
                <div>
                  <span className="font-medium">Glow Duration:</span>{' '}
                  {animationPresets[selectedPreset].glowDuration}s
                </div>
                <div>
                  <span className="font-medium">Notification:</span>{' '}
                  {animationPresets[selectedPreset].notificationDuration / 1000}
                  s
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={triggerDemo}
              className="flex items-center space-x-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <Play className="h-5 w-5" />
              <span>Trigger New Block</span>
            </button>

            <button
              onClick={dismissNotification}
              className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="h-5 w-5" />
              <span>Dismiss Notification</span>
            </button>
          </div>
        </div>

        {/* Animation Demo Area */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 relative overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-6">
            Live Block Animation Preview
          </h2>

          {/* New Block Notification */}
          {animationState.showNotification && animationState.newBlock && (
            <div className="notification-toast-in mb-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 new-block-shimmer pointer-events-none" />

              <div className="flex items-center space-x-3 relative z-10">
                <div className="p-2 rounded-full bg-green-500/20 sparkle-icon">
                  <Sparkles className="h-4 w-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-green-400 font-semibold text-sm">
                    New Block Mined!
                  </div>
                  <div className="text-white text-xs">
                    Block #{animationState.newBlock.height} •{' '}
                    {formatTime(animationState.newBlock.time)}
                  </div>
                </div>
                <button
                  onClick={dismissNotification}
                  className="p-1 rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-110"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Particle Effects */}
          {animationState.showParticles && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {particles.map(particle => (
                <div
                  key={particle.id}
                  className="particle"
                  style={{
                    left: `${particle.left}%`,
                    animationDelay: `${particle.delay}ms`,
                    animationDuration: `${particle.duration}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Demo Block */}
          <div className="space-y-3">
            {animationState.isNewBlock && animationState.newBlock ? (
              <div
                className={`group bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all duration-500 ease-in-out cursor-pointer border border-transparent hover:border-white/10 hover:scale-[1.02] gpu-accelerated new-block-enhanced-glow new-block-slide-in new-block-shimmer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`p-1.5 rounded-md transition-all duration-500 ease-in-out ${getBlockTypeColor(animationState.newBlock.blocktype, animationState.newBlock.validationtype)} new-block-bounce`}
                    >
                      <Zap className="h-3 w-3 transition-all duration-300 ease-in-out sparkle-icon" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold transition-all duration-300 ease-in-out text-green-400">
                          #{animationState.newBlock.height.toLocaleString()}
                        </span>
                        <span className="text-green-400 text-xs font-medium new-block-scale-in">
                          NEW
                        </span>
                        <span className="text-blue-200 text-xs">
                          {animationState.newBlock.validationtype === 'stake'
                            ? 'PoS'
                            : 'PoW'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTime(animationState.newBlock.time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Activity className="h-3 w-3" />
                          <span>{animationState.newBlock.nTx} tx</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            {formatDifficulty(
                              animationState.newBlock.difficulty
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">
                        {formatSize(animationState.newBlock.size)}
                      </div>
                      {animationState.newBlock.reward && (
                        <div className="text-green-400 text-xs">
                          {animationState.newBlock.reward.toFixed(2)} VRSC
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-400 font-mono break-all">
                  {animationState.newBlock.hash.substring(0, 20)}...
                  {animationState.newBlock.hash.substring(
                    animationState.newBlock.hash.length - 8
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-sm">
                  Click &quot;Trigger New Block&quot; to see the animation
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Animation Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Sparkles className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Slide-in Animation
              </h3>
            </div>
            <p className="text-blue-200 text-sm">
              Smooth slide-in effect from top with blur and scale transitions
              for new blocks.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Glow Effects</h3>
            </div>
            <p className="text-blue-200 text-sm">
              Pulsing glow effects with enhanced borders and shadow animations
              for highlighting.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Particle Effects
              </h3>
            </div>
            <p className="text-blue-200 text-sm">
              Floating particle animations that create a celebratory effect for
              new blocks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
