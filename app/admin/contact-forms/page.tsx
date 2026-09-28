'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import { getContactLeads, type ContactLead } from '@/lib/crm';

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function ContactFormsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setLeads(await getContactLeads()); }
    catch { setLeads([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <CrmShell title="Contact Forms">
      <div className="crm-toolbar">
        <p style={{ color: 'var(--crm-ink-soft)', margin: 0, flex: 1 }}>
          People who submitted the website contact form. Click one to open their contact record.
        </p>
        <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
          {leads.length} submission{leads.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="crm-empty" style={{ padding: '50px 24px' }}>
          <p>No contact form submissions yet.</p>
        </div>
      ) : (
        <div className="crm-card">
          {leads.map((l) => (
            <div key={l.id} className="crm-row" onClick={() => router.push(`/admin/people/${l.contact_id}`)} style={{ cursor: 'pointer' }}>
              <div className="grow">
                <div className="nm">{l.name || l.email || 'Unknown'}</div>
                <div className="meta">
                  {l.email}{l.phone ? ` · ${l.phone}` : ''}{l.contact_method ? ` · prefers ${l.contact_method}` : ''}
                </div>
                {l.message && <div className="meta" style={{ marginTop: 5, color: 'var(--crm-ink)' }}>{l.message}</div>}
              </div>
              <div className="right" style={{ color: 'var(--crm-ink-soft)' }}>{fmtDateTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </CrmShell>
  );
}
