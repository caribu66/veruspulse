/**
 * SEO Metadata for each language
 * Language-specific metadata for better SEO
 */

import { type Metadata } from 'next';
import { type Locale } from './types';

interface LocaleMetadata {
  title: string;
  description: string;
  keywords: string;
}

export const SEO_METADATA: Record<Locale, LocaleMetadata> = {
  en: {
    title: 'VerusPulse - The Internet of Value',
    description:
      'Explore the Verus Protocol ecosystem - The Internet of Value. Track Smart Transactions, analyze PBaaS chains, monitor staking rewards, explore VerusID identity system, and discover protocol-level currencies across the multi-chain Verus network.',
    keywords:
      'Verus, blockchain, explorer, PBaaS, VerusID, staking, DeFi, cryptocurrency',
  },
  es: {
    title: 'VerusPulse - El Internet del Valor',
    description:
      'Explora el ecosistema del Protocolo Verus - El Internet del Valor. Rastrea Transacciones Inteligentes, analiza cadenas PBaaS, monitorea recompensas de staking, explora el sistema de identidad VerusID y descubre monedas a nivel de protocolo.',
    keywords:
      'Verus, blockchain, explorador, PBaaS, VerusID, staking, DeFi, criptomonedas',
  },
  fr: {
    title: "VerusPulse - L'Internet de la Valeur",
    description:
      "Explorez l'écosystème du protocole Verus - L'Internet de la Valeur. Suivez les transactions intelligentes, analysez les chaînes PBaaS, surveillez les récompenses de staking, explorez le système d'identité VerusID et découvrez les devises au niveau du protocole.",
    keywords:
      'Verus, blockchain, explorateur, PBaaS, VerusID, staking, DeFi, cryptomonnaie',
  },
  de: {
    title: 'VerusPulse - Das Internet des Wertes',
    description:
      'Erkunden Sie das Verus-Protokoll-Ökosystem - Das Internet des Wertes. Verfolgen Sie intelligente Transaktionen, analysieren Sie PBaaS-Ketten, überwachen Sie Staking-Belohnungen, erkunden Sie das VerusID-Identitätssystem und entdecken Sie Währungen auf Protokollebene.',
    keywords:
      'Verus, Blockchain, Explorer, PBaaS, VerusID, Staking, DeFi, Kryptowährung',
  },
  zh: {
    title: 'VerusPulse - 价值互联网',
    description:
      '探索Verus协议生态系统 - 价值互联网。追踪智能交易，分析PBaaS链，监控质押奖励，探索VerusID身份系统，发现协议级货币。',
    keywords:
      'Verus, 区块链, 浏览器, PBaaS, VerusID, 质押, DeFi, 加密货币',
  },
  ja: {
    title: 'VerusPulse - 価値のインターネット',
    description:
      'Verusプロトコルエコシステムを探索 - 価値のインターネット。スマートトランザクションの追跡、PBaaSチェーンの分析、ステーキング報酬の監視、VerusID識別システムの探索、プロトコルレベルの通貨の発見。',
    keywords:
      'Verus, ブロックチェーン, エクスプローラー, PBaaS, VerusID, ステーキング, DeFi, 暗号通貨',
  },
  pt: {
    title: 'VerusPulse - A Internet do Valor',
    description:
      'Explore o ecossistema do Protocolo Verus - A Internet do Valor. Rastreie Transações Inteligentes, analise cadeias PBaaS, monitore recompensas de staking, explore o sistema de identidade VerusID e descubra moedas em nível de protocolo.',
    keywords:
      'Verus, blockchain, explorador, PBaaS, VerusID, staking, DeFi, criptomoeda',
  },
  ru: {
    title: 'VerusPulse - Интернет Ценности',
    description:
      'Исследуйте экосистему протокола Verus - Интернет Ценности. Отслеживайте умные транзакции, анализируйте цепочки PBaaS, отслеживайте награды за стейкинг, изучайте систему идентификации VerusID и открывайте валюты на уровне протокола.',
    keywords:
      'Verus, блокчейн, обозреватель, PBaaS, VerusID, стейкинг, DeFi, криптовалюта',
  },
};

/**
 * Generate metadata for a specific locale
 * @param locale - Locale code
 * @returns Metadata object
 */
export function generateMetadata(locale: Locale): Metadata {
  const meta = SEO_METADATA[locale];

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: 'VerusPulse' }],
    alternates: {
      canonical: `/${locale === 'en' ? '' : locale}`,
      languages: Object.entries(SEO_METADATA).reduce(
        (acc, [lang, _]) => ({
          ...acc,
          [lang]: `/${lang === 'en' ? '' : lang}`,
        }),
        {}
      ),
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
      locale: locale,
      alternateLocale: Object.keys(SEO_METADATA).filter(l => l !== locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
  };
}

