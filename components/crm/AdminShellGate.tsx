'use client';

import { usePathname } from 'next/navigation';
import CrmShell from './CrmShell';

// Renders the persistent CRM shell (sidebar) once for every authenticated
// route, so navigating between admin pages only swaps the content — the
// sidebar never remounts. The login page (/admin) renders bare.
export default function AdminShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin') return <>{children}</>;
  return <CrmShell>{children}</CrmShell>;
}
