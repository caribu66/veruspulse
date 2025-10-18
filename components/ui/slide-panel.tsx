'use client';

import React, { useEffect, ReactNode, useCallback } from 'react';
import { X, CaretLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Slide-In Panel Component
 * Provides a smooth slide-in panel from the right for detail views
 * Preserves context and allows stacking/pinning panels
 *
 * @example
 * ```tsx
 * <SlidePanel
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Block Details"
 * >
 *   <BlockDetails data={blockData} />
 * </SlidePanel>
 * ```
 */

export interface SlidePanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Panel title */
  title: string;
  /** Panel content */
  children: ReactNode;
  /** Panel width - responsive */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show backdrop */
  showBackdrop?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Additional class names */
  className?: string;
  /** Header actions (e.g., pin, share buttons) */
  headerActions?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'lg',
  showBackdrop = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  headerActions,
  footer,
}: SlidePanelProps) {
  // Width styles
  const widthStyles = {
    sm: 'w-full md:w-96',
    md: 'w-full md:w-1/2',
    lg: 'w-full md:w-2/3',
    xl: 'w-full md:w-3/4',
    full: 'w-full',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 bg-black/60  z-40 animate-in fade-in duration-200"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full bg-slate-900 shadow-2xl z-50',
          'border-l border-white/10',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300',
          widthStyles[width],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-900/95  border-b border-white/10 p-4 md:p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close panel"
              >
                <CaretLeft className="h-5 w-5 text-gray-400" />
              </button>
              <h2
                id="panel-title"
                className="text-lg md:text-xl font-bold text-white truncate"
              >
                {title}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {headerActions}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close panel"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 bg-slate-900/95  border-t border-white/10 p-4 md:p-6 sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Slide Panel Stack Manager
 * Manages multiple panels that can be stacked
 */
export interface PanelStackItem {
  id: string;
  title: string;
  content: ReactNode;
}

export interface SlidePanelStackProps {
  panels: PanelStackItem[];
  onClose: (id: string) => void;
  onCloseAll: () => void;
}

export function SlidePanelStack({
  panels,
  onClose,
  onCloseAll,
}: SlidePanelStackProps) {
  return (
    <>
      {panels.map((panel, index) => (
        <SlidePanel
          key={panel.id}
          isOpen={true}
          onClose={() => onClose(panel.id)}
          title={panel.title}
          width={index === panels.length - 1 ? 'lg' : 'md'}
          className={cn(
            'transition-transform',
            index < panels.length - 1 && 'translate-x-16' // Offset previous panels
          )}
        >
          {panel.content}
        </SlidePanel>
      ))}

      {/* Stack controls */}
      {panels.length > 1 && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {panels.length} panels open
              </span>
              <button
                onClick={onCloseAll}
                className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
              >
                Close All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
