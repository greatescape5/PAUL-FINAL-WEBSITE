'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import {
  getExpenses, createExpense, updateExpense, archiveExpense,
  type Expense, type Recurrence,
} from '@/lib/crm';

const money = (n: number, cents = false) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

// Parse 'YYYY-MM-DD' as a local date (avoids UTC off-by-one).
function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const today = () => new Date().toISOString().slice(0, 10);

function fmtDate(s: string) {
  return parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | Expense | 'new'>(null);

  const load = useCallback(async () => {
    try { setExpenses(await getExpenses()); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- Totals ----
  const { monthlyRecurring, oneTimeTotal, thisMonth } = useMemo(() => {
    const now = new Date();
    let mr = 0, ot = 0, otThisMonth = 0;
    for (const e of expenses) {
      const amt = Number(e.amount);
      if (e.recurrence === 'monthly') { mr += amt; }
      else {
        ot += amt;
        const d = parseDate(e.incurred_on);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) otThisMonth += amt;
      }
    }
    return { monthlyRecurring: mr, oneTimeTotal: ot, thisMonth: mr + otThisMonth };
  }, [expenses]);

  // ---- Monthly chart data (rolling 12 months) ----
  const chart = useMemo(() => {
    const now = new Date();
    const monthly = expenses.filter((e) => e.recurrence === 'monthly');
    const oneTime = expenses.filter((e) => e.recurrence === 'one_time');
    const months: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const rec = monthly
        .filter((e) => parseDate(e.incurred_on) <= last)
        .reduce((s, e) => s + Number(e.amount), 0);
      const ot = oneTime
        .filter((e) => { const d = parseDate(e.incurred_on); return d >= first && d <= last; })
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({ label: first.toLocaleDateString('en-US', { month: 'short' }), total: rec + ot });
    }
    return months;
  }, [expenses]);

  async function del(e: Expense) {
    if (!confirm(`Remove "${e.name}"? You can't undo this from here.`)) return;
    await archiveExpense(e.id);
    load();
  }

  return (
    <CrmShell title="Expenses">
      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : (
        <>
          <div className="crm-toolbar" style={{ justifyContent: 'flex-end' }}>
            <button className="action-btn primary" onClick={() => setSheet('new')}>+ Add expense</button>
          </div>

          <div className="crm-stats">
            <div className="crm-stat accent">
              <div className="val">{money(monthlyRecurring)}</div>
              <div className="lbl">Monthly recurring</div>
            </div>
            <div className="crm-stat">
              <div className="val">{money(thisMonth)}</div>
              <div className="lbl">This month (recurring + one-time)</div>
            </div>
            <div className="crm-stat">
              <div className="val">{money(oneTimeTotal)}</div>
              <div className="lbl">One-time total (all time)</div>
            </div>
          </div>

          <div className="crm-card chart-card">
            <div className="chart-title">Total expenses by month</div>
            <LineChart data={chart} />
          </div>

          {expenses.length === 0 ? (
            <div className="crm-empty" style={{ padding: '40px 24px' }}>
              <p>No expenses yet — add your first with the button above.</p>
            </div>
          ) : (
            <div className="crm-card">
              {expenses.map((e) => (
                <div key={e.id} className="crm-row" onClick={() => setSheet(e)}>
                  <span className={`rec-badge ${e.recurrence}`}>{e.recurrence === 'monthly' ? 'Monthly' : 'One-time'}</span>
                  <div className="grow">
                    <div className="nm">{e.name}</div>
                    <div className="meta">{fmtDate(e.incurred_on)}</div>
                  </div>
                  <div className="right">
                    <span className="rate">{money(Number(e.amount), true)}{e.recurrence === 'monthly' && <span style={{ color: 'var(--crm-ink-mute)', fontWeight: 400 }}>/mo</span>}</span>
                  </div>
                  <button className="action-btn" style={{ padding: '6px 10px' }} onClick={(ev) => { ev.stopPropagation(); del(e); }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {sheet && (
        <ExpenseSheet
          expense={sheet === 'new' ? null : sheet}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); load(); }}
        />
      )}
    </CrmShell>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG line chart (no external library)
// ---------------------------------------------------------------------------
function LineChart({ data }: { data: { label: string; total: number }[] }) {
  const W = 720, H = 240, padL = 52, padR = 16, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  const rawMax = Math.max(...data.map((d) => d.total), 0);
  // Round the axis max up to a "nice" number.
  const niceMax = rawMax <= 0 ? 100 : Math.ceil(rawMax / 100) * 100;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH * (1 - v / niceMax);

  const linePts = data.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');
  const areaPts = `${padL},${padT + innerH} ${linePts} ${x(n - 1)},${padT + innerH}`;
  const gridVals = [0, niceMax / 2, niceMax];

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Total expenses by month">
      {/* gridlines + y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--crm-border)" strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--crm-ink-mute)">
            {money(v)}
          </text>
        </g>
      ))}
      {/* area + line */}
      <polygon points={areaPts} fill="var(--blue)" opacity="0.12" />
      <polyline points={linePts} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots + x labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.total)} r="3.5" fill="var(--blue)" />
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--crm-ink-mute)">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Add / edit sheet
// ---------------------------------------------------------------------------
function ExpenseSheet({
  expense, onClose, onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(expense?.name ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [date, setDate] = useState(expense?.incurred_on ?? today());
  const [recurrence, setRecurrence] = useState<Recurrence>(expense?.recurrence ?? 'one_time');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) { alert('Enter a valid amount.'); return; }
    setBusy(true);
    try {
      if (expense) await updateExpense(expense.id, { name: name.trim(), amount: amt, incurred_on: date, recurrence });
      else await createExpense({ name: name.trim(), amount: amt, incurred_on: date, recurrence });
      onSaved();
    } catch (e: any) {
      alert(e?.message ?? 'Could not save');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{expense ? 'Edit expense' : 'Add expense'}</h3>
        <div className="field"><label>Expense</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PT Distinction subscription" autoFocus /></div>
        <div className="field"><label>Amount ($)</label>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 49.99" /></div>
        <div className="field"><label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field">
          <label>Type</label>
          <div className="opt-grid">
            <button type="button" className={`opt${recurrence === 'one_time' ? ' on' : ''}`} onClick={() => setRecurrence('one_time')}>One-time</button>
            <button type="button" className={`opt${recurrence === 'monthly' ? ' on' : ''}`} onClick={() => setRecurrence('monthly')}>Monthly recurring</button>
          </div>
        </div>
        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy || !name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
