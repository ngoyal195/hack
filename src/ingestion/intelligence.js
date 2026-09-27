import { fingerprintTransaction } from "./schema";

export function reconcileWithLive(transactions = [], livePayments = []) {
  return transactions.map(t => {
    const td = new Date(`${t.date}T12:00:00`).getTime();
    const match = livePayments.some(l => {
      const ld = new Date(l.timestamp || `${l.date || t.date}T12:00:00`).getTime();
      const days = Math.abs(td - ld) / 86400000;
      const amount = Math.abs(Number(l.amount) || 0);
      const merchantA = String(t.merchant || "").toLowerCase();
      const merchantB = String(l.merchant || "").toLowerCase();
      return days <= 2 && Math.abs(Math.abs(t.amount) - amount) <= 2 && (merchantA === merchantB || merchantA.includes(merchantB) || merchantB.includes(merchantA));
    });
    return { ...t, capturedLive: Boolean(t.capturedLive || match) };
  });
}

export function detectRecurring(transactions = []) {
  const groups = new Map();
  transactions.forEach(t => {
    if (t.amount >= 0 || t.excluded) return;
    const key = String(t.merchant || "unknown").toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  });

  const recurringIds = new Set();
  const groupIdByTxn = new Map();
  for (const [key, items] of groups) {
    items.sort((a, b) => a.date.localeCompare(b.date));
    let evidence = items.some(x => x.is_recurring);
    for (let i = 1; i < items.length; i++) {
      const gap = (new Date(items[i].date) - new Date(items[i - 1].date)) / 86400000;
      if (gap >= 20 && gap <= 45) evidence = true;
    }
    if (evidence && items.length >= 1) {
      const id = `rec_${key.replace(/[^a-z0-9]+/gi, "_").slice(0, 70)}`;
      items.forEach(x => { recurringIds.add(x.id); groupIdByTxn.set(x.id, id); });
    }
  }

  return transactions.map(t => ({
    ...t,
    is_recurring: recurringIds.has(t.id),
    recurring_group_id: groupIdByTxn.get(t.id) || t.recurring_group_id || null
  }));
}

export async function reconcileAndDetect(transactions, livePayments) {
  const reconciled = reconcileWithLive(transactions, livePayments);
  return detectRecurring(reconciled);
}

export function dedupeTransactions(transactions = []) {
  const seen = new Set();
  return transactions.filter(t => {
    const key = fingerprintTransaction(t);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
