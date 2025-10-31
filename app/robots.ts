/**
 * Robots.txt Generation
 * Next.js 15 App Router
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import { type MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veruspulse.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/block/',
          '/transaction/',
          '/verusid/',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/address/', // Privacy: don't index individual addresses
        ],
      },
      {
        userAgent: 'GPTBot', // OpenAI crawler
        disallow: '/', // Opt-out of AI training
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot', // Common Crawl
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended', // Google Bard
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

