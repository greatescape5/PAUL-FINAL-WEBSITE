import type { Metadata } from 'next';
import './admin.css';
import AdminShellGate from '@/components/crm/AdminShellGate';

// The CRM is private — keep it out of search indexes entirely.
export const metadata: Metadata = {
  title: 'CRM',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShellGate>{children}</AdminShellGate>;
}
