import type { Metadata } from 'next';
import './admin.css';

// The CRM is private — keep it out of search indexes entirely.
export const metadata: Metadata = {
  title: 'CRM',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
