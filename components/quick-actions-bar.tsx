'use client';

import { useState } from 'react';
import {
  MagnifyingGlass,
  UsersThree,
  Pulse,
  Database,
  QuestionMark,
  Lightning,
  ArrowRight,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import Link from 'next/link';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  action: () => void;
  href?: string;
  external?: boolean;
}

interface QuickActionsBarProps {
  onTabChange: (tab: string) => void;
}

export function QuickActionsBar({ onTabChange }: QuickActionsBarProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'search',
      label: 'Search',
      description: 'Find blocks, transactions, addresses',
      icon: MagnifyingGlass,
      color: 'text-slate-300',
      bgColor: 'bg-slate-600/20',
      action: () => onTabChange('explorer'),
    },
    {
      id: 'blocks',
      label: 'Latest Blocks',
      description: 'Recent blockchain activity',
      icon: Database,
      color: 'text-slate-200',
      bgColor: 'bg-slate-500/20',
      action: () => onTabChange('explorer'),
    },
    {
      id: 'verusids',
      label: 'VerusIDs',
      description: 'Identity system explorer',
      icon: UsersThree,
      color: 'text-slate-300',
      bgColor: 'bg-slate-600/20',
      action: () => onTabChange('verusids'),
    },
  ];

  const QuickActionButton = ({ action }: { action: QuickAction }) => {
    const Icon = action.icon;
    const isHovered = hoveredAction === action.id;

    const buttonContent = (
      <button
        onClick={action.action}
        onMouseEnter={() => setHoveredAction(action.id)}
        onMouseLeave={() => setHoveredAction(null)}
        className={`
          group relative w-full p-3 md:p-4 rounded-xl border transition-all duration-300
          ${action.bgColor} ${action.color} border-white/10
          hover:border-white/30 hover:scale-105 hover:shadow-lg
          focus:outline-none focus:ring-2 focus:ring-white/20
          active:scale-95 touch-manipulation
          min-h-[80px] md:min-h-[100px]
        `}
        style={{
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Background Glow Effect */}
        <div
          className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
          transition-opacity duration-300 ${action.bgColor}
        `}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div
              className={`
              p-2 rounded-lg transition-transform duration-300
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}
            >
              <Icon className="h-6 w-6" />
            </div>
            <ArrowRight
              className={`
              h-4 w-4 transition-all duration-300
              ${isHovered ? 'translate-x-1 -translate-y-1' : 'translate-x-0 translate-y-0'}
            `}
            />
          </div>

          <h3 className="text-xs sm:text-sm font-semibold text-white mb-1 group-hover:text-white leading-tight">
            {action.label}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed">
            {action.description}
          </p>
        </div>

        {/* Hover Indicator */}
        <div
          className={`
          absolute bottom-0 left-0 right-0 h-1 rounded-b-xl
          bg-gradient-to-r from-transparent via-white/20 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
        `}
        />
      </button>
    );

    return buttonContent;
  };

  return (
    <div className="bg-gradient-to-r from-verus-blue/10 via-verus-blue/5 to-verus-green/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Lightning className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Quick Actions</h3>
            <p className="text-sm text-gray-400">Jump to popular features</p>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {quickActions.map(action => (
          <QuickActionButton key={action.id} action={action} />
        ))}
      </div>

      {/* Footer - Essential Links */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/api/docs"
            className="flex items-center gap-2 text-gray-400 hover:text-verus-blue transition-colors"
          >
            <ArrowSquareOut className="h-4 w-4" />
            API Documentation
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-2 text-gray-400 hover:text-verus-blue transition-colors"
          >
            <QuestionMark className="h-4 w-4" />
            Help & Support
          </Link>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function QuickActionsCompact({
  onTabChange,
}: {
  onTabChange: (tab: string) => void;
}) {
  const compactActions = [
    {
      id: 'search',
      label: 'Search',
      icon: MagnifyingGlass,
      action: () => onTabChange('explorer'),
    },
    {
      id: 'blocks',
      label: 'Blocks',
      icon: Database,
      action: () => onTabChange('explorer'),
    },
    {
      id: 'verusids',
      label: 'VerusIDs',
      icon: UsersThree,
      action: () => onTabChange('verusids'),
    },
  ];

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h4 className="text-sm font-semibold text-white mb-3">Quick Access</h4>
      <div className="grid grid-cols-2 gap-2">
        {compactActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
