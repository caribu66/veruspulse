'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface BackButtonProps {
  /**
   * Optional custom fallback path if no history exists
   */
  fallbackPath?: string;

  /**
   * Optional custom label (defaults to {tCommon("back")})
   */
  label?: string;

  /**
   * Optional custom className for styling
   */
  className?: string;

  /**
   * Show icon only (no text)
   */
  iconOnly?: boolean;

  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Button style variant
   */
  variant?: 'default' | 'ghost' | 'outline';
}

/**
 * Reusable back button component with smart navigation history tracking
 */
export function BackButton({
  fallbackPath,
  label,
  className,
  iconOnly = false,
  size = 'md',
  variant = 'default',
}: BackButtonProps) {
  const tCommon = useTranslations('common');
  const { goBack, getBackPath } = useNavigationHistory();
  const displayLabel = label || tCommon("back");

  const handleClick = () => {
    goBack(fallbackPath);
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant styles
  const variantStyles = {
    default: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    ghost: 'bg-transparent hover:bg-white/10 text-gray-300 hover:text-white',
    outline:
      'bg-transparent border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center space-x-2 rounded-lg transition-colors font-medium',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      aria-label={displayLabel}
      title={`Go back to ${getBackPath()}`}
    >
      <ArrowLeft className={iconSizes[size]} />
      {!iconOnly && <span>{displayLabel}</span>}
    </button>
  );
}
