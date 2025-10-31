'use client';

import React, { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  CheckCircle,
  WarningCircle,
  XCircle,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';

/**
 * Enhanced Input Component with Validation States
 * Provides comprehensive form input experience with validation feedback
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email Address"
 *   type="email"
 *   error="Please enter a valid email"
 *   helperText="We'll never share your email"
 *   required
 * />
 * ```
 */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Error message (shows error state) */
  error?: string;
  /** Warning message (shows warning state) */
  warning?: string;
  /** Success state indicator */
  success?: boolean;
  /** Success message */
  successMessage?: string;
  /** Input size variant */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
  /** Show character count (requires maxLength) */
  showCount?: boolean;
  /** Icon to display at start of input */
  startIcon?: React.ReactNode;
  /** Icon to display at end of input */
  endIcon?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Optional validation function */
  validate?: (value: string) => { valid: boolean; message?: string };
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      warning,
      success,
      successMessage,
      inputSize = 'md',
      fullWidth = false,
      showCount = false,
      startIcon,
      endIcon,
      loading = false,
      validate,
      className,
      type = 'text',
      maxLength,
      required,
      disabled,
      value,
      onChange,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(value || '');
    const [validationState, setValidationState] = useState<{
      valid: boolean;
      message?: string;
    } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    // Determine current state
    const hasError = Boolean(error);
    const hasWarning = Boolean(warning) && !hasError;
    const hasSuccess = Boolean(success || validationState?.valid) && !hasError && !hasWarning;
    const isPassword = type === 'password';

    // Size styles
    const sizeStyles = {
      sm: 'text-sm px-3 py-2 min-h-[40px]',
      md: 'text-base px-4 py-2.5 min-h-[44px]',
      lg: 'text-lg px-5 py-3 min-h-[52px]',
    };

    // Base input styles
    const baseInputStyles = cn(
      'w-full rounded-lg border transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800',
      'placeholder:text-gray-400 dark:placeholder:text-slate-500',
      sizeStyles[inputSize],
      startIcon && 'pl-11',
      (endIcon || isPassword || loading) && 'pr-11'
    );

    // State-specific styles
    const stateStyles = cn({
      // Default state
      'border-gray-300 dark:border-slate-700 focus:border-verus-blue focus:ring-verus-blue/20':
        !hasError && !hasWarning && !hasSuccess,
      // Error state
      'border-verus-red focus:border-verus-red focus:ring-verus-red/20':
        hasError,
      // Warning state
      'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500/20':
        hasWarning,
      // Success state
      'border-verus-green focus:border-verus-green focus:ring-verus-green/20':
        hasSuccess,
      // Focused state
      'ring-2': isFocused,
    });

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);

      // Run validation if provided
      if (validate && newValue) {
        const result = validate(newValue);
        setValidationState(result);
      } else {
        setValidationState(null);
      }

      onChange?.(e);
    };

    // Handle blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // Run validation on blur if provided
      if (validate && e.target.value) {
        const result = validate(e.target.value);
        setValidationState(result);
      }

      onBlur?.(e);
    };

    // Status icon component
    const StatusIcon = () => {
      if (loading) {
        return (
          <div className="animate-spin h-5 w-5 border-2 border-verus-blue border-t-transparent rounded-full"
               role="status"
               aria-label={tCommon("loading")} />
        );
      }

      if (hasError) {
        return <XCircle className="h-5 w-5 text-verus-red" weight="fill" aria-hidden="true" />;
      }

      if (hasWarning) {
        return <WarningCircle className="h-5 w-5 text-yellow-500" weight="fill" aria-hidden="true" />;
      }

      if (hasSuccess) {
        return <CheckCircle className="h-5 w-5 text-verus-green" weight="fill" aria-hidden="true" />;
      }

      return null;
    };

    // Character count
    const currentLength = typeof internalValue === 'string' ? internalValue.length : 0;
    const showCharCount = showCount && maxLength;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium',
              hasError && 'text-verus-red',
              hasWarning && 'text-yellow-600 dark:text-yellow-500',
              hasSuccess && 'text-verus-green',
              !hasError && !hasWarning && !hasSuccess && 'text-gray-700 dark:text-slate-300'
            )}
          >
            {label}
            {required && <span className="text-verus-red ml-1" aria-label="required">*</span>}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Start icon */}
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none">
              {startIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            maxLength={maxLength}
            required={required}
            disabled={disabled || loading}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={cn(
              baseInputStyles,
              stateStyles,
              'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              helperText && helperId,
              error && errorId
            )}
            aria-required={required}
            {...props}
          />

          {/* End icon / Status / Password toggle */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPassword && !loading && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlash className="h-5 w-5" weight="regular" />
                ) : (
                  <Eye className="h-5 w-5" weight="regular" />
                )}
              </button>
            )}
            {!isPassword && endIcon && !loading && !hasError && !hasWarning && !hasSuccess && (
              <span className="text-gray-400 dark:text-slate-500">{endIcon}</span>
            )}
            <StatusIcon />
          </div>
        </div>

        {/* Helper text / Error message / Success message */}
        <div className="min-h-[1.25rem]">
          {error && (
            <p
              id={errorId}
              className="text-sm text-verus-red flex items-center gap-1"
              role="alert"
            >
              <XCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              <span>{error}</span>
            </p>
          )}

          {!error && warning && (
            <p
              className="text-sm text-yellow-600 dark:text-yellow-500 flex items-center gap-1"
              role="alert"
            >
              <WarningCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              <span>{warning}</span>
            </p>
          )}

          {!error && !warning && hasSuccess && successMessage && (
            <p className="text-sm text-verus-green flex items-center gap-1">
              <CheckCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              <span>{successMessage}</span>
            </p>
          )}

          {!error && !warning && !successMessage && validationState?.message && (
            <p
              className={cn(
                'text-sm flex items-center gap-1',
                validationState.valid ? 'text-verus-green' : 'text-verus-red'
              )}
            >
              {validationState.valid ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              )}
              <span>{validationState.message}</span>
            </p>
          )}

          {!error && !warning && !successMessage && !validationState?.message && helperText && (
            <p
              id={helperId}
              className="text-sm text-gray-500 dark:text-slate-400"
            >
              {helperText}
            </p>
          )}

          {/* Character count */}
          {showCharCount && (
            <p
              className={cn(
                'text-xs text-right',
                currentLength > maxLength! * 0.9 ? 'text-yellow-600' : 'text-gray-400 dark:text-slate-500',
                currentLength >= maxLength! && 'text-verus-red'
              )}
              aria-live="polite"
            >
              {currentLength} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

/**
 * Textarea Component with same validation features
 */
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  warning?: string;
  success?: boolean;
  successMessage?: string;
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showCount?: boolean;
  loading?: boolean;
  validate?: (value: string) => { valid: boolean; message?: string };
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      warning,
      success,
      successMessage,
      inputSize = 'md',
      fullWidth = false,
      showCount = false,
      loading = false,
      validate,
      className,
      maxLength,
      required,
      disabled,
      value,
      onChange,
      onBlur,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(value || '');
    const [validationState, setValidationState] = useState<{
      valid: boolean;
      message?: string;
    } | null>(null);

    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasError = Boolean(error);
    const hasWarning = Boolean(warning) && !hasError;
    const hasSuccess = Boolean(success || validationState?.valid) && !hasError && !hasWarning;

    const sizeStyles = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-4 py-2.5',
      lg: 'text-lg px-5 py-3',
    };

    const baseStyles = cn(
      'w-full rounded-lg border transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800',
      'placeholder:text-gray-400 dark:placeholder:text-slate-500',
      'resize-y',
      sizeStyles[inputSize]
    );

    const stateStyles = cn({
      'border-gray-300 dark:border-slate-700 focus:border-verus-blue focus:ring-verus-blue/20':
        !hasError && !hasWarning && !hasSuccess,
      'border-verus-red focus:border-verus-red focus:ring-verus-red/20': hasError,
      'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500/20': hasWarning,
      'border-verus-green focus:border-verus-green focus:ring-verus-green/20': hasSuccess,
      'ring-2': isFocused,
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);

      if (validate && newValue) {
        const result = validate(newValue);
        setValidationState(result);
      } else {
        setValidationState(null);
      }

      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);

      if (validate && e.target.value) {
        const result = validate(e.target.value);
        setValidationState(result);
      }

      onBlur?.(e);
    };

    const currentLength = typeof internalValue === 'string' ? internalValue.length : 0;
    const showCharCount = showCount && maxLength;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium',
              hasError && 'text-verus-red',
              hasWarning && 'text-yellow-600 dark:text-yellow-500',
              hasSuccess && 'text-verus-green',
              !hasError && !hasWarning && !hasSuccess && 'text-gray-700 dark:text-slate-300'
            )}
          >
            {label}
            {required && <span className="text-verus-red ml-1" aria-label="required">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            value={value}
            maxLength={maxLength}
            required={required}
            disabled={disabled || loading}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            rows={rows}
            className={cn(
              baseStyles,
              stateStyles,
              'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              helperText && helperId,
              error && errorId
            )}
            aria-required={required}
            {...props}
          />

          {loading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin h-5 w-5 border-2 border-verus-blue border-t-transparent rounded-full"
                   role="status"
                   aria-label={tCommon("loading")} />
            </div>
          )}
        </div>

        <div className="min-h-[1.25rem]">
          {error && (
            <p id={errorId} className="text-sm text-verus-red flex items-center gap-1" role="alert">
              <XCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              <span>{error}</span>
            </p>
          )}

          {!error && warning && (
            <p className="text-sm text-yellow-600 dark:text-yellow-500 flex items-center gap-1" role="alert">
              <WarningCircle className="h-4 w-4 flex-shrink-0" weight="fill" />
              <span>{warning}</span>
            </p>
          )}

          {!error && !warning && helperText && (
            <p id={helperId} className="text-sm text-gray-500 dark:text-slate-400">
              {helperText}
            </p>
          )}

          {showCharCount && (
            <p
              className={cn(
                'text-xs text-right',
                currentLength > maxLength! * 0.9 ? 'text-yellow-600' : 'text-gray-400 dark:text-slate-500',
                currentLength >= maxLength! && 'text-verus-red'
              )}
              aria-live="polite"
            >
              {currentLength} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
