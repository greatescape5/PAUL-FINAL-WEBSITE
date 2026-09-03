// Structured-data (schema.org / JSON-LD) builders.
// Keep these pure — they return plain objects that <JsonLd data={...} /> renders.
import { BUSINESS, SITE_URL, absoluteUrl, sameAs } from '@/lib/site';

const ORG_ID = `${SITE_URL}/#business`;

function postalAddress() {
  const a = BUSINESS.address;
  return {
    '@type': 'PostalAddress',
    ...(a.street ? { streetAddress: a.street } : {}),
    addressLocality: a.city,
    addressRegion: a.region,
    ...(a.postalCode ? { postalCode: a.postalCode } : {}),
    addressCountry: a.country,
  };
}

// Core business entity. He coaches remotely, so this is a
// HealthAndBeautyBusiness (a professional-service subtype) — NOT a LocalBusiness
// tied to a storefront. areaServed carries the remote/online reach.
export function businessSchema() {
  const links = sameAs();
  return {
    '@context': 'https://schema.org',
    '@type': ['HealthAndBeautyBusiness', 'SportsActivityLocation'],
    '@id': ORG_ID,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: SITE_URL,
    telephone: BUSINESS.phoneE164,
    ...(BUSINESS.email ? { email: BUSINESS.email } : {}),
    image: absoluteUrl('/opengraph-image'),
    logo: absoluteUrl('/icon.png'),
    priceRange: BUSINESS.priceRange,
    address: postalAddress(),
    areaServed: BUSINESS.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
    ...(links.length ? { sameAs: links } : {}),
  };
}

// Site-wide WebSite entity.
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BUSINESS.name,
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
  };
}

// Breadcrumb trail for a page. Pass ordered [{name, path}] items.
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
