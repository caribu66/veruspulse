/**
 * VerusID Format Validation Utilities
 */

export interface VerusIDValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  correctedFormat?: string;
}

/**
 * Validate and provide helpful feedback for VerusID format
 *
 * Valid formats:
 * - name@ (e.g., "veruspulse@")
 * - name.VRSC@ (e.g., "veruspulse.VRSC@")
 * - i-address (e.g., "iABC123...")
 *
 * Common mistakes:
 * - @name (missing @ at the end)
 * - name (missing @ completely)
 * - @name@ (@ on both sides)
 */
export function validateVerusIDFormat(input: string): VerusIDValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'VerusID cannot be empty',
    };
  }

  const trimmed = input.trim();

  // Check if it's an I-address (starts with 'i' and is long enough)
  if (trimmed.startsWith('i') && trimmed.length > 30) {
    return { isValid: true };
  }

  // Common mistake: @name instead of name@
  if (trimmed.startsWith('@') && !trimmed.endsWith('@')) {
    const corrected = trimmed.slice(1) + '@';
    return {
      isValid: false,
      error: 'Incorrect format: @ should be at the END, not the beginning',
      suggestion: `Did you mean: "${corrected}"?`,
      correctedFormat: corrected,
    };
  }

  // Missing @ completely
  if (!trimmed.includes('@')) {
    const corrected = trimmed + '@';
    return {
      isValid: false,
      error: 'Missing @ symbol at the end',
      suggestion: `VerusID names must end with @. Try: "${corrected}" or "${trimmed}.VRSC@"`,
      correctedFormat: corrected,
    };
  }

  // @ on both sides
  if (trimmed.startsWith('@') && trimmed.endsWith('@')) {
    const corrected = trimmed.slice(1);
    return {
      isValid: false,
      error: '@ symbol should only be at the END',
      suggestion: `Did you mean: "${corrected}"?`,
      correctedFormat: corrected,
    };
  }

  // Valid format: ends with @
  if (trimmed.endsWith('@')) {
    // Check for valid characters (alphanumeric, dots, underscores, hyphens)
    const nameWithoutAt = trimmed.slice(0, -1);
    const validChars = /^[a-zA-Z0-9._-]+$/;

    if (!validChars.test(nameWithoutAt)) {
      return {
        isValid: false,
        error: 'VerusID contains invalid characters',
        suggestion:
          'VerusID names can only contain letters, numbers, dots (.), underscores (_), and hyphens (-)',
      };
    }

    return { isValid: true };
  }

  // Unknown format
  return {
    isValid: false,
    error: 'Invalid VerusID format',
    suggestion:
      'Valid formats: "name@" or "name.VRSC@" or an I-address starting with "i"',
  };
}

/**
 * Get helpful examples for VerusID format
 */
export function getVerusIDFormatExamples(): string[] {
  return ['pancho77@', 'pancho77.VRSC@', 'joanna@', 'allbits@'];
}

/**
 * Auto-correct common VerusID format mistakes
 */
export function autoCorrectVerusID(input: string): string {
  if (!input) return input;

  const trimmed = input.trim();

  // Fix @name -> name@
  if (trimmed.startsWith('@') && !trimmed.endsWith('@')) {
    return trimmed.slice(1) + '@';
  }

  // Fix @name@ -> name@
  if (trimmed.startsWith('@') && trimmed.endsWith('@')) {
    return trimmed.slice(1);
  }

  // Add @ if missing (but not for I-addresses)
  if (!trimmed.includes('@') && !trimmed.startsWith('i')) {
    return trimmed + '@';
  }

  return trimmed;
}
