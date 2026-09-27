import Papa from "papaparse";
import { makeImportResult } from "./schema";
import { normalizeRow } from "./normalize";

function clean(v) { return String(v ?? "").trim(); }

function findHeaderIndex(rows) {
  const candidates = rows.map((row, i) => {
    const cells = row.map(clean).map(x => x.toLowerCase());
    const hasDate = cells.some(x => /^(date|transaction date|txn date)$/.test(x));
    const hasNarration = cells.some(x => /narration|description|particulars|transaction details/.test(x));
    const hasAmount = cells.some(x => /amount|withdrawal|deposit|debit|credit/.test(x));
    return { i, score: (hasDate ? 3 : 0) + (hasNarration ? 3 : 0) + (hasAmount ? 2 : 0) };
  }).sort((a, b) => b.score - a.score);
  return candidates[0]?.score >= 5 ? candidates[0].i : -1;
}

function rowsToObjects(rows, headerIndex) {
  const headers = rows[headerIndex].map((h, i) => clean(h) || `column_${i}`);
  return rows.slice(headerIndex + 1).map(cells => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] ?? "");
    return obj;
  });
}

export function parseCsvFile(file) {
  return new Promise(resolve => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      complete: ({ data, errors, meta }) => {
        const rows = data.filter(row => Array.isArray(row) && row.some(v => clean(v) !== ""));
        const headerIndex = findHeaderIndex(rows);
        if (headerIndex < 0) {
          resolve(makeImportResult({
            warnings: errors.map(e => `CSV row ${e.row ?? "?"}: ${e.message}`),
            errors: ["Could not find a transaction header row. Expected columns such as Date + Narration + Withdrawal/Deposit or Amount."],
            metadata: { format: "CSV", delimiter: meta?.delimiter || ",", rows: rows.length }
          }));
          return;
        }

        const objects = rowsToObjects(rows, headerIndex);
        const transactions = [];
        const warnings = errors.map(e => `CSV row ${e.row ?? "?"}: ${e.message}`);

        objects.forEach((row, i) => {
          const withdrawal = Object.entries(row).find(([k]) => /withdrawal\s*amt|withdrawal amount|debit amount|^debit$/i.test(k))?.[1];
          const deposit = Object.entries(row).find(([k]) => /deposit\s*amt|deposit amount|credit amount|^credit$/i.test(k))?.[1];
          let amountOverride = null;
          if (clean(withdrawal) !== "") amountOverride = -Math.abs(Number(String(withdrawal).replace(/,/g, "")) || 0);
          else if (clean(deposit) !== "") amountOverride = Math.abs(Number(String(deposit).replace(/,/g, "")) || 0);

          const t = normalizeRow(row, {
            source: file.name,
            index: i,
            sourceType: "csv",
            amountOverride
          });
          if (t.amount !== 0 && t.raw_description !== "Imported transaction") transactions.push(t);
        });

        resolve(makeImportResult({
          transactions,
          warnings,
          metadata: {
            format: "CSV",
            delimiter: meta?.delimiter || ",",
            headerRow: headerIndex + 1,
            sourceRows: objects.length,
            rows: transactions.length
          }
        }));
      },
      error: e => resolve(makeImportResult({ errors: [e.message || "Could not read CSV"] }))
    });
  });
}
