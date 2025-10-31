/**
 * Dynamic Sitemap Generation
 * Next.js 15 App Router
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { type MetadataRoute } from 'next';
import { staticPages } from '@/lib/seo/metadata';
// import { generateSitemapEntry } from '@/lib/seo/metadata'; // Unused

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Start with static pages
  const routes: MetadataRoute.Sitemap = [...staticPages];

  // TODO: Add dynamic routes
  // Example: Fetch recent blocks/transactions from cache
  // const recentBlocks = await getRecentBlocks();
  // routes.push(...recentBlocks.map(block => generateSitemapEntry(`/block/${block.hash}`)));

  return routes;
}

