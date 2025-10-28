/**
 * Haptic Feedback Utilities
 * Provides native-like tactile feedback for mobile interactions
 */

export const haptics = {
  /**
   * Light haptic feedback (10ms)
   * Use for: Button taps, switches, selections
   */
  light: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium haptic feedback (20ms)
   * Use for: Important actions, confirmations
   */
  medium: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy haptic feedback (30ms)
   * Use for: Critical actions, errors
   */
  heavy: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Success pattern (pulse)
   * Use for: Successful operations, confirmations
   */
  success: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * Error pattern (strong pulses)
   * Use for: Errors, warnings, failed operations
   */
  error: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Selection pattern (quick tap)
   * Use for: Tab switches, navigation
   */
  selection: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },

  /**
   * Check if haptics are supported
   */
  isSupported: () => {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  },
};
