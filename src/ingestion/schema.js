export const CATEGORIES = [
  "Housing",
  "Bills & Utilities",
  "EMIs & Loans",
  "Subscriptions & Entertainment",
  "Health",
  "Food & Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Family & Personal",
  "Travel",
  "Other",
  "Investments & Savings",
  "Income",
  "Transfer"
];

export function makeImportResult({ transactions = [], warnings = [], errors = [], metadata = {} } = {}) {
  return { transactions, warnings, errors, metadata };
}

export function fingerprintTransaction(t) {
  return [
    t.date,
    Number(t.amount || 0).toFixed(2),
    String(t.merchant || "").toLowerCase().trim(),
    String(t.raw_description || "").toLowerCase().trim()
  ].join("|");
}
