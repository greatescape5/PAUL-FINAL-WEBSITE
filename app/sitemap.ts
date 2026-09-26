import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getPublishedPrograms } from '@/lib/programs-server';

export const revalidate = 60;

// Public routes only. Add new pages here as later phases ship
// (/success-stories, /start, /guide, /privacy, /terms).
const ROUTES = ['/', '/coaching', '/programs', '/about', '/contact'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));
  const programRoutes = (await getPublishedPrograms()).map((p) => ({
    url: `${SITE_URL}/programs/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...programRoutes];
}
