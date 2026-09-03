import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Public routes only. Add new pages here as later phases ship
// (/programs, /success-stories, /start, /guide, /privacy, /terms).
const ROUTES = ['/', '/about', '/contact'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }));
}
