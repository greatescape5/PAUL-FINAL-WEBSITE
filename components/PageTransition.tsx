'use client';

import { usePathname } from 'next/navigation';

// Re-keys on the route so each navigation replays a quick fade-in, softening
// the content swap between pages. Respects prefers-reduced-motion via CSS.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The CRM keeps its sidebar persistent and fades only its content area
  // (handled inside CrmShell), so skip the whole-page fade there.
  if (pathname?.startsWith('/admin')) return <>{children}</>;
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
