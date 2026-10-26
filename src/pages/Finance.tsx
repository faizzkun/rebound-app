import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Field, Err, Ok, errText, PageHead, Seg, Empty } from '../components/ui';
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
    <div className="page-narrow">
      <PageHead title="Finance" tagline="Simple rule, written on the tin: your balance is never typed in — it is opening balance plus every transaction. If a number looks wrong, fix the transaction, not the total. And finance is never, ever public." />
      <Err msg={err} /><Ok msg={ok} />
      <Card title="Your accounts">
        {accounts.length === 0 ? <Empty text="No accounts yet. Create your first one below — a wallet, a bank account, whatever you actually use." /> : accounts.map((a) => (
          <div className="hrow" key={a.id}>
            <div className="hrow-main"><b>{a.name}</b></div>
            <div className="balance">PKR {balance(a).toLocaleString()}</div>
            <div className="hrow-meta">Started at PKR {a.opening_balance.toLocaleString()} · balance = opening + all transactions</div>
          </div>
        ))}
        {impulse.length > 0 ? <div className="notebox">Impulse / regretted spending so far: <b>{impulse.length} transactions</b> — review them honestly, then plan the rebound.</div> : null}
        <form onSubmit={addAccount} className="form-stack" style={{ marginTop: 8 }}>
          <Field label="New account name"><input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="e.g. Cash wallet, Bank" /></Field>
          <Field label="Opening balance (PKR)"><input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0 if you don't know it exactly" /></Field>
          <button className="btn block" type="submit">Create account</button>
        </form>
      </Card>
      <Card title="Add a transaction">
        <form onSubmit={addTxn} className="form-stack">
          <Field label="Account"><select value={accId} onChange={(e) => setAccId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Seg label="Money in or out?" value={kind} onChange={setKind} options={[
            { value: 'expense', label: 'Spent' }, { value: 'income', label: 'Earned' }, { value: 'refund', label: 'Refund' },
            { value: 'transfer', label: 'Transfer' }, { value: 'adjustment', label: 'Adjustment' },
          ]} />
          <Field label="Amount (PKR)"><input type="number" step="0.01" min={0} required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="What for?"><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Groceries, Fuel, Client payment" /></Field>
          <Seg label="Was it worth it?" value={spendingClass} onChange={setSpendingClass} options={[
            { value: 'necessary', label: 'Necessary' }, { value: 'useful', label: 'Useful' }, { value: 'discretionary', label: 'Discretionary' },
            { value: 'impulse', label: 'Impulse' }, { value: 'regretted', label: 'Regretted' },
          ]} />
          <Field label="Note (optional)"><input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Reason (optional)"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <button className="btn block" type="submit">Post transaction</button>
        </form>
      </Card>
      <Card title="Recent transactions">
        {txns.length === 0 ? <Empty text="No transactions yet." /> : txns.map((t) => (
          <div className="hrow" key={t.id}>
            <div className="hrow-main"><b>{t.kind}</b> · {t.category ?? '—'} · <b>PKR {t.amount}</b></div>
            <div className="hrow-meta">{t.txn_at.slice(0, 10)} · {t.spending_class ?? '—'}{t.description ? ` · ${t.description}` : ''}</div>
            <div className="hrow-actions"><button className="txt-danger" onClick={() => delTxn(t.id)}>Delete</button></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
