'use client';

import CrmShell from '@/components/crm/CrmShell';
import ProgramsAdmin from '@/components/crm/ProgramsAdmin';

export default function ProgramsPage() {
  return (
    <CrmShell title="Programs">
      <ProgramsAdmin />
    </CrmShell>
  );
}
