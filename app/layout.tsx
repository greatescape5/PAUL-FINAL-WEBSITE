import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';

// Elegant serif matching the Flow Motion logo wordmark — used for select display
// headings. The body stays on the Helvetica system stack.
const logoFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-logo',
  display: 'swap',
});
import SiteFooter from '@/components/SiteFooter';
import PageTransition from '@/components/PageTransition';
import NewsletterPopup from '@/components/NewsletterPopup';
import Analytics from '@/components/Analytics';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, BUSINESS } from '@/lib/site';
import { websiteSchema } from '@/lib/seo';

// Helvetica throughout (matches the brand). Helvetica isn't a webfont — it's a
// system face — so we use the native stack rather than next/font, falling back
// to Arial where Helvetica isn't installed.

const TITLE_DEFAULT = 'Flow Motion Personal Training | 1:1 Online Fitness Coaching | Spokane, WA';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: '%s | Flow Motion Personal Training',
  },
  description: BUSINESS.description,
  applicationName: BUSINESS.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BUSINESS.name,
    locale: 'en_US',
    url: SITE_URL,
    title: TITLE_DEFAULT,
    description: BUSINESS.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: BUSINESS.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={logoFont.variable}>
      <body>
        <JsonLd data={websiteSchema()} />
        <SiteHeader />
        <main><PageTransition>{children}</PageTransition></main>
        <SiteFooter />
        <NewsletterPopup />
        <Analytics />
      </body>
    </html>
  );
}
