'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Gear,
  Sparkle,
  Lightning,
  Shield,
  Hammer,
  X,
  Clock,
  Pulse,
  TrendUp,
  CaretRight,
} from '@phosphor-icons/react';
import {
  useNewBlockAnimations,
  createParticleEffects,
} from '@/lib/hooks/useNewBlockAnimations';
import './animations/new-block-animations.css';

export function AnimationShowcase() {
  const tCommon = useTranslations('common');
  const tTime = useTranslations('time');
  const tBlocks = useTranslations('blocks');
  const tStaking = useTranslations('staking');

  const [isPlaying, setIsPlaying] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState(createParticleEffects());

  const { animationState, triggerNewBlockAnimation, dismissNotification } =
    useNewBlockAnimations({
      notificationDuration: 5000,
      particleDuration: 3000,
      onNewBlock: () => {
        setParticles(createParticleEffects(8));
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 3000);
      },
    });

  const triggerDemo = () => {
    setIsPlaying(true);
    const newBlock = {
      hash: `demo${Math.random().toString(36).substring(7)}`,
      height: 266464,
      time: Math.floor(Date.now() / 1000),
      size: 4096,
      nTx: 3,
      difficulty: 38000000000,
      blocktype: 'minted',
      validationtype: 'stake',
      reward: 24.0,
    };
    triggerNewBlockAnimation(newBlock);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold theme-text-primary">
          🚀 New Block Animations
        </h1>
        <p className="theme-text-secondary text-lg max-w-2xl mx-auto">
          Beautiful, performant animations for new blockchain block arrivals.
          Perfect for your Verus explorer!
        </p>
      </div>

      {/* Demo Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 relative overflow-hidden">
        <h2 className="text-2xl font-semibold theme-text-primary mb-6">
          Live Demo
        </h2>

        {/* Particle Effects */}
        {showParticles && (
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

        {/* Demo Button */}
        <div className="text-center mb-8">
          <button
            onClick={triggerDemo}
            disabled={isPlaying}
            className={`flex items-center space-x-3 mx-auto px-8 py-4 rounded-xl transition-all duration-300 ${
              isPlaying
                ? 'bg-green-500/30 text-green-300 cursor-not-allowed'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:scale-105'
            }`}
          >
            <Play className="h-6 w-6" />
            <span className="text-lg font-semibold">
              {isPlaying ? 'Animating...' : 'Trigger New Block Animation'}
            </span>
          </button>
        </div>

        {/* Notification Display */}
        {animationState.showNotification && animationState.newBlock && (
          <div className="notification-toast-in mb-6 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 new-block-shimmer pointer-events-none" />

            <div className="flex items-center space-x-3 relative z-10">
              <div className="p-2 rounded-full bg-green-500/20 sparkle-icon">
                <Sparkle className="h-4 w-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-green-400 font-semibold text-sm">
                  New Block Mined!
                </div>
                <div className="text-white text-xs">
                  Block #{animationState.newBlock.height} • Just now
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

        {/* Sample Block */}
        <div className="max-w-2xl mx-auto">
          <div
            className={`group bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all duration-500 ease-in-out cursor-pointer border border-transparent hover:border-white/10 hover:scale-[1.02] gpu-accelerated ${
              animationState.isNewBlock
                ? 'new-block-enhanced-glow new-block-slide-in new-block-shimmer'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className={`p-1.5 rounded-md transition-all duration-500 ease-in-out ${
                    animationState.isNewBlock
                      ? 'text-green-400 bg-green-500/10 border-green-500/20 new-block-bounce'
                      : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  {animationState.isNewBlock ? (
                    <Lightning className="h-3 w-3 transition-all duration-300 ease-in-out sparkle-icon" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-semibold transition-all duration-300 ease-in-out ${
                        animationState.isNewBlock
                          ? 'text-green-400'
                          : 'text-white'
                      }`}
                    >
                      #{animationState.newBlock?.height || '266,463'}
                    </span>
                    {animationState.isNewBlock && (
                      <span className="text-green-400 text-xs font-medium new-block-scale-in">
                        NEW
                      </span>
                    )}
                    <span className="text-blue-200 text-xs">PoS</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{tTime("justNow")}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Pulse className="h-3 w-3" />
                      <span>{animationState.newBlock?.nTx || '2'} tx</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendUp className="h-3 w-3" />
                      <span>37.29 M</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-white text-sm font-medium">
                    {animationState.newBlock ? '4.0 KB' : '3.0 KB'}
                  </div>
                  <div className="text-green-400 text-xs">24.00 VRSC</div>
                </div>
                <CaretRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-400 font-mono break-all">
              {animationState.newBlock?.hash.substring(0, 20) ||
                '00000000000068e8038e'}
              ...
              {animationState.newBlock?.hash.substring(
                animationState.newBlock.hash.length - 8
              ) || 'fd83b874'}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Sparkle className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Slide-in Animation
            </h3>
          </div>
          <p className="text-blue-200 text-sm">
            Smooth slide-in effect from top with blur and scale transitions for
            new blocks.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Lightning className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Glow Effects</h3>
          </div>
          <p className="text-blue-200 text-sm">
            Pulsing glow effects with enhanced borders and shadow animations for
            highlighting.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Sparkle className="h-5 w-5 text-verus-blue" />
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

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Performance Optimized
            </h3>
          </div>
          <p className="text-blue-200 text-sm">
            GPU-accelerated animations with throttling and reduced motion
            support.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Hammer className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Easy Integration
            </h3>
          </div>
          <p className="text-blue-200 text-sm">
            Drop-in replacement for existing components with backward
            compatibility.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Gear className="h-5 w-5 text-verus-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Customizable</h3>
          </div>
          <p className="text-blue-200 text-sm">
            Multiple presets and easy customization options for different use
            cases.
          </p>
        </div>
      </div>

      {/* Integration Instructions */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
        <h2 className="text-2xl font-semibold theme-text-primary mb-6">
          Quick Integration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">
              1. Import CSS
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400">import</div>
              <div className="text-white">
                &apos;./animations/new-block-animations.css&apos;
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">
              2. Use Hook
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400">const</div>
              <div className="text-blue-400">
                {'{ animationState, processNewBlocks }'}
              </div>
              <div className="text-white">=</div>
              <div className="text-green-400">useNewBlockAnimations</div>
              <div className="text-white">();</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">
              3. Apply Classes
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
              <div className="text-blue-400">className</div>
              <div className="text-white">
                =&quot;new-block-slide-in new-block-glow&quot;
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">
              4. Process Blocks
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400">processNewBlocks</div>
              <div className="text-white">(blocks);</div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm">
            <strong>Ready to use!</strong> Your existing LiveBlocksCard has been
            enhanced with these animations. Just refresh your app to see the new
            effects in action.
          </p>
        </div>
      </div>
    </div>
  );
}
