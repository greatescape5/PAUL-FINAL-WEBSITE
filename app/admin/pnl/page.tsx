'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import {
  getExpenses, createExpense, updateExpense, archiveExpense,
  getBillingContacts, getMrr,
  type Expense, type Recurrence, type BillingContact,
} from '@/lib/crm';

const money = (n: number, cents = false) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string) => parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const REVENUE_COLOR = '#10b981';
const EXPENSE_COLOR = '#b51f21';

export default function PnlPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billing, setBilling] = useState<BillingContact[]>([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | Expense | 'new'>(null);

  const load = useCallback(async () => {
    try {
      const [exp, bill, mrrRow] = await Promise.all([
        getExpenses().catch(() => []),
        getBillingContacts().catch(() => []),
        getMrr().catch(() => ({ mrr: 0 } as any)),
      ]);
      setExpenses(exp);
      setBilling(bill);
      setMrr(Number(mrrRow?.mrr ?? 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.recurrence === 'monthly').reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );
  const net = mrr - monthlyExpenses;

  // Rolling 12-month revenue vs expenses.
  const chart = useMemo(() => {
    const now = new Date();
    const monthly = expenses.filter((e) => e.recurrence === 'monthly');
    const oneTime = expenses.filter((e) => e.recurrence === 'one_time');
    const months: { label: string; revenue: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      // Revenue: subscriptions whose active window overlaps this month.
      const revenue = billing.reduce((s, c) => {
        const start = c.started_on ? parseDate(c.started_on) : null;
        const end = c.cancelled_on ? parseDate(c.cancelled_on) : null;
        const startedByNow = !start || start <= last;
        const notCancelledYet = !end || end >= first;
        return startedByNow && notCancelledYet ? s + Number(c.monthly_rate) : s;
      }, 0);
      // Expenses: recurring carried across + one-time in this month.
      const rec = monthly.filter((e) => parseDate(e.incurred_on) <= last).reduce((s, e) => s + Number(e.amount), 0);
      const ot = oneTime.filter((e) => { const d = parseDate(e.incurred_on); return d >= first && d <= last; }).reduce((s, e) => s + Number(e.amount), 0);
      months.push({ label: first.toLocaleDateString('en-US', { month: 'short' }), revenue, expense: rec + ot });
    }
    return months;
  }, [expenses, billing]);

  // Last 4 calendar quarters: revenue, expenses, profit.
  const quarters = useMemo(() => {
    const now = new Date();
    const monthly = expenses.filter((e) => e.recurrence === 'monthly');
    const oneTime = expenses.filter((e) => e.recurrence === 'one_time');
    const curQStartAbs = now.getFullYear() * 12 + Math.floor(now.getMonth() / 3) * 3;
    const out: { label: string; revenue: number; expense: number; profit: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const startAbs = curQStartAbs - i * 3;
      const sy = Math.floor(startAbs / 12), sm = startAbs % 12;
      let revenue = 0, expense = 0;
      for (let mo = 0; mo < 3; mo++) {
        const first = new Date(sy, sm + mo, 1);
        const last = new Date(sy, sm + mo + 1, 0, 23, 59, 59);
        revenue += billing.reduce((s, c) => {
          const st = c.started_on ? parseDate(c.started_on) : null;
          const en = c.cancelled_on ? parseDate(c.cancelled_on) : null;
          return (!st || st <= last) && (!en || en >= first) ? s + Number(c.monthly_rate) : s;
        }, 0);
        const rec = monthly.filter((e) => parseDate(e.incurred_on) <= last).reduce((s, e) => s + Number(e.amount), 0);
        const ot = oneTime.filter((e) => { const d = parseDate(e.incurred_on); return d >= first && d <= last; }).reduce((s, e) => s + Number(e.amount), 0);
        expense += rec + ot;
      }
      out.push({ label: `Q${Math.floor(sm / 3) + 1} ${sy}`, revenue, expense, profit: revenue - expense });
    }
    return out;
  }, [expenses, billing]);

  async function del(e: Expense) {
    if (!confirm(`Remove "${e.name}"?`)) return;
    await archiveExpense(e.id);
    load();
  }

  return (
    <CrmShell title="Profit & Loss">
      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : (
        <>
          <div className="crm-toolbar" style={{ justifyContent: 'flex-end' }}>
            <button className="action-btn primary" onClick={() => setSheet('new')}>+ Add expense</button>
          </div>

          <div className="crm-stats">
            <div className="crm-stat">
              <div className="val" style={{ color: REVENUE_COLOR }}>{money(mrr)}</div>
              <div className="lbl">Monthly revenue (MRR)</div>
            </div>
            <div className="crm-stat">
              <div className="val" style={{ color: EXPENSE_COLOR }}>{money(monthlyExpenses)}</div>
              <div className="lbl">Monthly expenses</div>
            </div>
            <div className="crm-stat">
              <div className="val" style={{ color: net >= 0 ? REVENUE_COLOR : EXPENSE_COLOR }}>{money(net)}</div>
              <div className="lbl">Net profit / month</div>
            </div>
          </div>

          <div className="crm-card chart-card">
            <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Revenue vs expenses by month</span>
              <span style={{ display: 'inline-flex', gap: 16, textTransform: 'none', letterSpacing: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: REVENUE_COLOR }} />Revenue</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: EXPENSE_COLOR }} />Expenses</span>
              </span>
            </div>
            <PnlChart data={chart} />
          </div>

          <div className="crm-group-title">Quarterly summary</div>
          <div className="crm-card" style={{ padding: '4px 12px' }}>
            <table className="crm-table">
              <thead>
                <tr><th>Quarter</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr>
              </thead>
              <tbody>
                {quarters.map((q) => (
                  <tr key={q.label}>
                    <td>{q.label}</td>
                    <td style={{ color: REVENUE_COLOR }}>{money(q.revenue)}</td>
                    <td style={{ color: EXPENSE_COLOR }}>{money(q.expense)}</td>
                    <td style={{ color: q.profit >= 0 ? REVENUE_COLOR : EXPENSE_COLOR, fontWeight: 700 }}>{money(q.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="crm-group-title" style={{ marginTop: 34 }}>
            Expenses <span className="count">{expenses.length}</span>
          </div>
          <p className="form-note" style={{ margin: '-6px 0 12px', color: 'var(--crm-ink-soft)' }}>
            Revenue is calculated automatically from your active client subscriptions. Add costs below.
          </p>
          {expenses.length === 0 ? (
            <div className="crm-empty" style={{ padding: '36px 24px' }}><p>No expenses yet — add your first above.</p></div>
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
// Two-series inline SVG chart (no external library)
// ---------------------------------------------------------------------------
function PnlChart({ data }: { data: { label: string; revenue: number; expense: number }[] }) {
  const [hover, setHover] = useState<{ i: number; key: 'revenue' | 'expense' } | null>(null);
  const W = 720, H = 250, padL = 52, padR = 16, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  const rawMax = Math.max(...data.flatMap((d) => [d.revenue, d.expense]), 0);
  const niceMax = rawMax <= 0 ? 100 : Math.ceil(rawMax / 500) * 500;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH * (1 - v / niceMax);
  const pts = (key: 'revenue' | 'expense') => data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');
  const gridVals = [0, niceMax / 2, niceMax];
  const color = (key: 'revenue' | 'expense') => (key === 'revenue' ? REVENUE_COLOR : EXPENSE_COLOR);

  // Tooltip geometry for the hovered point.
  let tip: null | { rx: number; ty: number; rectY: number; w: number; label: string; sub: string; c: string } = null;
  if (hover) {
    const d = data[hover.i];
    const v = d[hover.key];
    const cx = x(hover.i), cy = y(v);
    const label = money(v);
    const sub = `${d.label} · ${hover.key === 'revenue' ? 'Revenue' : 'Expenses'}`;
    const w = Math.max(96, sub.length * 6.2 + 20);
    const rx = Math.max(padL + w / 2, Math.min(W - padR - w / 2, cx));
    const above = cy - 44 > padT;
    tip = { rx, ty: cy, rectY: above ? cy - 46 : cy + 12, w, label, sub, c: color(hover.key) };
  }

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue vs expenses by month"
      onMouseLeave={() => setHover(null)}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--crm-border)" strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--crm-ink-mute)">{money(v)}</text>
        </g>
      ))}
      <polyline points={pts('revenue')} fill="none" stroke={REVENUE_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts('expense')} fill="none" stroke={EXPENSE_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.revenue)} r={hover?.i === i && hover.key === 'revenue' ? 5.5 : 3} fill={REVENUE_COLOR} />
          <circle cx={x(i)} cy={y(d.expense)} r={hover?.i === i && hover.key === 'expense' ? 5.5 : 3} fill={EXPENSE_COLOR} />
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--crm-ink-mute)">{d.label}</text>
          {/* generous invisible hover targets */}
          <circle cx={x(i)} cy={y(d.revenue)} r={13} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, key: 'revenue' })} />
          <circle cx={x(i)} cy={y(d.expense)} r={13} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, key: 'expense' })} />
        </g>
      ))}
      {tip && (
        <g pointerEvents="none">
          <rect x={tip.rx - tip.w / 2} y={tip.rectY} width={tip.w} height={34} rx={6} fill="#1f2a37" />
          <text x={tip.rx} y={tip.rectY + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{tip.label}</text>
          <text x={tip.rx} y={tip.rectY + 28} textAnchor="middle" fontSize="10" fill={tip.c}>{tip.sub}</text>
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Add / edit expense sheet
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
