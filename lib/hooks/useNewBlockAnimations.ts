import { useState, useEffect, useRef, useCallback } from 'react';

interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  nTx: number;
  difficulty: number;
  blocktype?: string;
  validationtype?: string;
  confirmations?: number;
  reward?: number;
  rewardType?: string;
}

interface AnimationState {
  isNewBlock: boolean;
  showNotification: boolean;
  showParticles: boolean;
  pulseAnimation: boolean;
  newBlock: Block | null;
}

interface UseNewBlockAnimationsOptions {
  notificationDuration?: number;
  particleDuration?: number;
  onNewBlock?: (block: Block) => void;
}

export function useNewBlockAnimations(
  options: UseNewBlockAnimationsOptions = {}
) {
  const {
    notificationDuration = 5000,
    particleDuration = 3000,
    onNewBlock,
  } = options;

  const [animationState, setAnimationState] = useState<AnimationState>({
    isNewBlock: false,
    showNotification: false,
    showParticles: false,
    pulseAnimation: false,
    newBlock: null,
  });

  const previousBlocksRef = useRef<Block[]>([]);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const particleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationQueueRef = useRef<Block[]>([]);

  const clearTimeouts = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    if (particleTimeoutRef.current) {
      clearTimeout(particleTimeoutRef.current);
      particleTimeoutRef.current = null;
    }
  }, []);

  const triggerNewBlockAnimation = useCallback(
    (block: Block) => {
      // Clear any existing animations
      clearTimeouts();

      // Update animation state
      setAnimationState({
        isNewBlock: true,
        showNotification: true,
        showParticles: true,
        pulseAnimation: true,
        newBlock: block,
      });

      // Call optional callback
      if (onNewBlock) {
        onNewBlock(block);
      }

      // Set up auto-hide timeouts
      notificationTimeoutRef.current = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          showNotification: false,
          isNewBlock: false,
          pulseAnimation: false,
        }));
      }, notificationDuration);

      particleTimeoutRef.current = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          showParticles: false,
        }));
      }, particleDuration);
    },
    [clearTimeouts, notificationDuration, particleDuration, onNewBlock]
  );

  const dismissNotification = useCallback(() => {
    clearTimeouts();
    setAnimationState({
      isNewBlock: false,
      showNotification: false,
      showParticles: false,
      pulseAnimation: false,
      newBlock: null,
    });
  }, [clearTimeouts]);

  const processNewBlocks = useCallback(
    (newBlocks: Block[]) => {
      if (previousBlocksRef.current.length === 0) {
        previousBlocksRef.current = newBlocks;
        return;
      }

      const latestPreviousBlock = previousBlocksRef.current[0];
      const latestNewBlock = newBlocks[0];

      if (
        latestNewBlock &&
        latestPreviousBlock &&
        latestNewBlock.hash !== latestPreviousBlock.hash
      ) {
        // Check if this is a truly new block (not just a reordering)
        const isNewBlock = !previousBlocksRef.current.find(
          block => block.hash === latestNewBlock.hash
        );

        if (isNewBlock) {
          triggerNewBlockAnimation(latestNewBlock);
        }
      }

      previousBlocksRef.current = newBlocks;
    },
    [triggerNewBlockAnimation]
  );

  // Performance optimization: throttle animation triggers
  const lastCallRef = useRef<number>(0);

  const throttledProcessNewBlocks = useCallback(
    (newBlocks: Block[]) => {
      const now = Date.now();
      const throttleDelay = 1000; // Minimum 1 second between animations

      if (now - lastCallRef.current >= throttleDelay) {
        lastCallRef.current = now;
        processNewBlocks(newBlocks);
      }
    },
    [processNewBlocks]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    animationState,
    processNewBlocks: throttledProcessNewBlocks,
    dismissNotification,
    triggerNewBlockAnimation,
  };
}

// Utility function to create particle effects
export function createParticleEffects(count: number = 8, delay: number = 100) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * delay,
    left: Math.random() * 100,
    duration: 2000 + Math.random() * 1000, // 2-3 seconds
  }));
}

// Animation presets for different block types
export const animationPresets = {
  fast: {
    slideInDuration: 0.4,
    glowDuration: 1.5,
    particleCount: 6,
    notificationDuration: 3000,
  },
  smooth: {
    slideInDuration: 0.8,
    glowDuration: 2.0,
    particleCount: 8,
    notificationDuration: 5000,
  },
  dramatic: {
    slideInDuration: 1.2,
    glowDuration: 3.0,
    particleCount: 12,
    notificationDuration: 7000,
  },
} as const;

export type AnimationPreset = keyof typeof animationPresets;
