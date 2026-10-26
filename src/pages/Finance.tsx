import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Field, Err, Ok, errText } from '../components/ui';
import type { FinAccount, FinTxn } from '../lib/types';

// Balances are DERIVED: opening_balance + signed transactions.
// There is intentionally no editable balance field anywhere in this app.
// income/refund add; expense adds negatively; transfer/adjustment are
// recorded as entered (signed by the amount's role in the account view:
// this app treats expense as negative, everything else as positive,
// and shows the formula so the number is auditable).
function signed(t: FinTxn): number {
  return t.kind === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount);
}

export default function Finance({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [txns, setTxns] = useState<FinTxn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [opening, setOpening] = useState('');
  const [accId, setAccId] = useState('');
  const [kind, setKind] = useState('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [spendingClass, setSpendingClass] = useState('necessary');
  const [desc, setDesc] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    const [a, t] = await Promise.all([
      supabase.from('financial_accounts').select('*').eq('owner_id', userId).order('name'),
      supabase.from('financial_transactions').select('*').eq('owner_id', userId).order('txn_at', { ascending: false }).limit(100),
    ]);
    if (a.error || t.error) { setErr(errText(a.error || t.error)); return; }
    setAccounts(a.data as FinAccount[]); setTxns(t.data as FinTxn[]);
    if (!accId && a.data?.length) setAccId((a.data as FinAccount[])[0].id);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addAccount(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { data, error } = await supabase.from('financial_accounts').insert({ owner_id: userId, name: accName, currency: 'PKR', opening_balance: opening ? Number(opening) : 0 }).select().single();
    if (error) { setErr(errText(error)); return; }
    setAccId(data.id); setAccName(''); setOpening(''); setOk('Account created. Balance starts at the opening balance and is derived from transactions after that.'); load();
  }
  async function addTxn(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!accId) { setErr('Create an account first.'); return; }
    const { error } = await supabase.from('financial_transactions').insert({
      owner_id: userId, account_id: accId, kind, category: category || null, txn_at: new Date().toISOString(),
      amount: Number(amount), currency: 'PKR', description: desc || null, reason: reason || null,
      spending_class: spendingClass, idempotency_key: `${userId}-${Date.now()}`,
    });
    if (error) { setErr(errText(error)); return; }
    setAmount(''); setDesc(''); setReason(''); setCategory(''); setOk('Transaction posted. Balance updated by derivation, not by editing.'); load();
  }
  async function delTxn(id: string) {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) setErr(errText(error)); else load();
  }

  const balance = (a: FinAccount) => a.opening_balance + txns.filter((t) => t.account_id === a.id).reduce((s, t) => s + signed(t), 0);
  const impulse = txns.filter((t) => t.spending_class === 'impulse' || t.spending_class === 'regretted');

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Finance (PKR)" sub="Balances are DERIVED: opening balance + signed transactions. There is no balance field to edit — if a number looks wrong, fix the transaction, not the total. Never published: finance has no public data, ever.">
        <form onSubmit={addAccount} className="grid">
          <Field label="Account name"><input required value={accName} onChange={(e) => setAccName(e.target.value)} /></Field>
          <Field label="Opening balance (PKR)"><input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Create account</button></div>
        </form>
        <ul className="list">{accounts.map((a) => (
          <li key={a.id}><span><b>{a.name}</b> · opening PKR {a.opening_balance} · <b>derived balance PKR {balance(a).toLocaleString()}</b></span></li>
        ))}{accounts.length === 0 ? <li className="muted">No accounts yet.</li> : null}</ul>
        {impulse.length > 0 ? <p className="muted">Impulse / regretted transactions so far: {impulse.length} — review them honestly, then plan the rebound.</p> : null}
      </Card>
      <Card title="Add transaction">
        <form onSubmit={addTxn} className="grid">
          <Field label="Account"><select value={accId} onChange={(e) => setAccId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Kind"><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="expense">expense</option><option value="income">income</option><option value="refund">refund</option><option value="transfer">transfer</option><option value="adjustment">adjustment</option></select></Field>
          <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Amount (PKR)"><input type="number" step="0.01" min={0} required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Spending class"><select value={spendingClass} onChange={(e) => setSpendingClass(e.target.value)}><option value="necessary">necessary</option><option value="useful">useful</option><option value="discretionary">discretionary</option><option value="impulse">impulse</option><option value="regretted">regretted</option></select></Field>
          <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Post transaction</button></div>
        </form>
      </Card>
      <Card title="Recent transactions">
        <ul className="list">{txns.map((t) => (
          <li key={t.id}><span>{t.txn_at.slice(0, 10)} · {t.kind} · {t.category ?? '—'} · PKR {t.amount} · {t.spending_class ?? '—'}{t.description ? ` · ${t.description}` : ''}</span>
            <button className="btn danger small" onClick={() => delTxn(t.id)}>Delete</button></li>
        ))}{txns.length === 0 ? <li className="muted">No transactions yet.</li> : null}</ul>
      </Card>
    </div>
  );
}
