/**
 * JSON-LD Structured Data Components
 * For Rich Search Results
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
 */

import Script from 'next/script';
import { generateStructuredData } from './metadata';

/**
 * Organization structured data
 * Add to root layout
 */
export function OrganizationSchema() {
  const structuredData = generateStructuredData('Organization');

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * WebApplication structured data
 * Add to homepage
 */
export function WebApplicationSchema() {
  const structuredData = generateStructuredData('WebApplication');

  return (
    <Script
      id="webapp-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Breadcrumb structured data
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Search Action structured data
 * Enables site search in Google
 */
export function SearchActionSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veruspulse.com';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Script
      id="search-action-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

