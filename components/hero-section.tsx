'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkle,
  Globe,
  Shield,
  Lightning,
  UsersThree,
  TrendUp,
  ArrowRight,
  ArrowSquareOut,
  MagnifyingGlass,
  ChartBar,
  Cpu,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Image from 'next/image';
import { formatHashRate, formatStake } from '@/lib/utils/number-formatting';
import { useTheme } from '@/contexts/theme-context';
import { SPACING_UTILS } from '@/lib/constants/design-tokens';

interface HeroSectionProps {
  networkStats?: {
    blocks: number;
    connections: number;
    circulatingSupply: number;
    verificationProgress: number;
  } | null;
  miningStats?: {
    networkhashps: number;
  } | null;
  stakingStats?: {
    netstakeweight: number;
  } | null;
}

export function HeroSection({
  networkStats,
  miningStats,
  stakingStats,
}: HeroSectionProps) {
  const t = useTranslations('hero');
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const { theme } = useTheme();

  // Fade in animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Rotate featured benefits
  const features = [
    {
      icon: Globe,
      text: t('featurePBaaS'),
    },
    { icon: Shield, text: t('featureIdentity') },
    { icon: Lightning, text: t('featureDeFi') },
    { icon: TrendUp, text: t('featureConsensus') },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  const stats = [
    {
      label: t('blockHeight'),
      value: networkStats?.blocks?.toLocaleString() || '...',
      icon: ChartBar,
      color: 'text-verus-blue',
    },
    {
      label: t('networkHash'),
      value: miningStats?.networkhashps
        ? formatHashRate(miningStats.networkhashps)
        : '...',
      icon: Cpu,
      color: 'text-verus-blue',
    },
    {
      label: t('circulatingSupply'),
      value: networkStats?.circulatingSupply
        ? `${(networkStats.circulatingSupply / 1000000).toFixed(2)}M`
        : '...',
      icon: UsersThree,
      color: 'text-verus-blue',
      suffix: 'VRSC',
    },
    {
      label: t('totalStakingSupply'),
      value:
        stakingStats?.netstakeweight && stakingStats.netstakeweight > 0
          ? formatStake(stakingStats.netstakeweight)
          : '...',
      icon: TrendUp,
      color: 'text-verus-blue',
      suffix: 'VRSC',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-950">
      {/* Subtle Pattern Overlay - Optional */}
      {/* <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 dark:opacity-5 opacity-10"></div> */}

      {/* Content */}
      <div
        className={`relative max-w-7xl mx-auto px-8 lg:px-12 ${SPACING_UTILS.hero}`}
      >
        <div
          className={`transition-all duration-1000 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Main Heading */}
          <div className="text-center mb-16 lg:mb-20">
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-tight">
              <span className="text-gray-900 dark:text-white"></span>
              <span style={{ color: '#3165d4' }}>{t('theInternetOfValue')}</span>
            </h1>

            <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              {t('subtitle')}
            </p>

            {/* Rotating Feature */}
            <div className="h-12 flex items-center justify-center mb-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`absolute transition-all duration-500 flex items-center gap-3 ${
                      currentFeature === index
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <Icon className="h-6 w-6 text-slate-300" />
                    <span className="text-lg text-slate-200 dark:text-slate-100 font-semibold">
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`bg-gray-50 dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-300 dark:border-slate-700
                    transform transition-all duration-300 hover:border-verus-blue/60 hover:shadow-lg
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Clean vertical layout for data presentation */}
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tabular-nums data-value">
                        {stat.value}
                      </div>
                      {(stat as any).suffix && (
                        <span className="text-sm md:text-base font-medium text-gray-600 dark:text-slate-400">
                          {(stat as any).suffix}
                        </span>
                      )}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary CTA Button */}
          <div className="flex items-center justify-center mb-16">
            <Link
              href="https://verus.io"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-10 py-5 bg-verus-blue hover:bg-verus-blue-dark text-white font-bold text-lg rounded-xl transition-all flex items-center gap-3 shadow-xl border border-verus-blue-light hover:shadow-2xl hover:scale-105"
            >
              <MagnifyingGlass className="h-6 w-6" />
              {t('startExploring')}
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Globe,
                title: t('pbaasTitle'),
                description: t('pbaasDescription'),
                iconColor: 'text-verus-blue',
                bgColor: 'bg-verus-blue/10',
                borderColor: 'border-verus-blue/40',
              },
              {
                icon: Shield,
                title: t('identityTitle'),
                description: t('identityDescription'),
                iconColor: 'text-verus-green',
                bgColor: 'bg-verus-green/10',
                borderColor: 'border-verus-green/40',
              },
              {
                icon: Lightning,
                title: t('defiTitle'),
                description: t('defiDescription'),
                iconColor: 'text-verus-blue',
                bgColor: 'bg-verus-blue/10',
                borderColor: 'border-verus-blue/40',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300 dark:border-slate-700
                    hover:border-verus-blue/60 transition-all duration-300 hover:shadow-lg
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                  style={{ transitionDelay: `${index * 150 + 400}ms` }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${feature.bgColor} border ${feature.borderColor} flex items-center justify-center mb-3 transition-transform`}
                  >
                    <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
