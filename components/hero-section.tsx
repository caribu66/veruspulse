'use client';

import { useEffect, useState } from 'react';
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
      text: 'Explore the Public Blockchains as a Service Protocol',
    },
    { icon: Shield, text: 'Self-Sovereign Identity with VerusID' },
    { icon: Lightning, text: 'Decentralized Finance on a Multi-Chain Network' },
    { icon: TrendUp, text: 'Proof of Stake & Proof of Work Consensus' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  const stats = [
    {
      label: 'Block Height',
      value: networkStats?.blocks?.toLocaleString() || '...',
      icon: ChartBar,
      color: 'text-blue-400',
    },
    {
      label: 'Network Hash',
      value: miningStats?.networkhashps
        ? formatHashRate(miningStats.networkhashps)
        : '...',
      icon: Cpu,
      color: 'text-green-400',
    },
    {
      label: 'Circulating Supply',
      value: networkStats?.circulatingSupply
        ? `${(networkStats.circulatingSupply / 1000000).toFixed(2)}M VRSC`
        : '...',
      icon: UsersThree,
      color: 'text-blue-400',
    },
    {
      label: 'Network Stake',
      value:
        stakingStats?.netstakeweight && stakingStats.netstakeweight > 0
          ? formatStake(stakingStats.netstakeweight)
          : '...',
      icon: TrendUp,
      color: 'text-green-400',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-950">
      {/* Subtle Pattern Overlay - Optional */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 dark:opacity-5 opacity-10"></div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div
          className={`transition-all duration-1000 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Main Heading */}
          <div className="text-center mb-12">
            {/* Verus Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src={
                  theme === 'light'
                    ? '/verus-mark-slogan-blue.png'
                    : '/verus-icon-slogan-white.svg'
                }
                alt="Verus Protocol"
                width={200}
                height={80}
                className="h-16 w-auto md:h-20"
                priority
              />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              The <span className="text-verus-blue">Internet of Value</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
              Explore the Verus Protocol ecosystem - where blockchain innovation
              meets real-world utility
            </p>

            {/* Rotating Feature */}
            <div className="h-8 flex items-center justify-center">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`absolute transition-all duration-500 flex items-center gap-2 ${
                      currentFeature === index
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-200 font-medium">
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
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tabular-nums data-value">
                      {stat.value}
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
              Start Exploring
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Globe,
                title: 'Public Blockchains as a Service',
                description:
                  'Launch your own blockchain with Verus PBaaS technology',
                iconColor: 'text-verus-blue',
                bgColor: 'bg-verus-blue/10',
                borderColor: 'border-verus-blue/40',
              },
              {
                icon: Shield,
                title: 'Self-Sovereign Identity',
                description: 'Control your digital identity with VerusID',
                iconColor: 'text-verus-green',
                bgColor: 'bg-verus-green/10',
                borderColor: 'border-verus-green/40',
              },
              {
                icon: Lightning,
                title: 'DeFi on Multi-Chain',
                description:
                  'Decentralized finance across interconnected blockchains',
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
