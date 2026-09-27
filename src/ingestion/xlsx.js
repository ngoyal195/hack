import * as XLSX from "xlsx";
import { makeImportResult } from "./schema";
import { normalizeRow } from "./normalize";

function clean(v) { return String(v ?? "").trim(); }
function findHeaderIndex(rows) {
  let best = { i: -1, score: 0 };
  rows.forEach((row, i) => {
    const cells = row.map(clean).map(x => x.toLowerCase());
    const score =
      (cells.some(x => /^(date|transaction date|txn date)$/.test(x)) ? 3 : 0) +
      (cells.some(x => /narration|description|particulars|transaction details/.test(x)) ? 3 : 0) +
      (cells.some(x => /amount|withdrawal|deposit|debit|credit/.test(x)) ? 2 : 0);
    if (score > best.score) best = { i, score };
  });
  return best.score >= 5 ? best.i : -1;
}

export async function parseSpreadsheetFile(file) {
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: true });
    const transactions = [];
    const warnings = [];
    const sheetInfo = [];

    for (const sheetName of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "", raw: true });
      const headerIndex = findHeaderIndex(rows);
      if (headerIndex < 0) {
        if (rows.length) warnings.push(`Sheet “${sheetName}” did not contain a recognizable transaction header.`);
        continue;
      }

      const headers = rows[headerIndex].map((h, i) => clean(h) || `column_${i}`);
      let count = 0;
      rows.slice(headerIndex + 1).forEach((cells, i) => {
        const row = {};
        headers.forEach((h, j) => row[h] = cells[j] ?? "");
        const withdrawal = Object.entries(row).find(([k]) => /withdrawal\s*amt|withdrawal amount|debit amount|^debit$/i.test(k))?.[1];
        const deposit = Object.entries(row).find(([k]) => /deposit\s*amt|deposit amount|credit amount|^credit$/i.test(k))?.[1];
        let amountOverride = null;
        if (clean(withdrawal) !== "") amountOverride = -Math.abs(Number(String(withdrawal).replace(/,/g, "")) || 0);
        else if (clean(deposit) !== "") amountOverride = Math.abs(Number(String(deposit).replace(/,/g, "")) || 0);
        const t = normalizeRow(row, { source: `${file.name} · ${sheetName}`, index: i, sourceType: "xlsx", amountOverride });
        if (t.amount !== 0 && t.raw_description !== "Imported transaction") { transactions.push(t); count++; }
      });
      sheetInfo.push({ sheet: sheetName, headerRow: headerIndex + 1, rows: count });
    }

    if (!transactions.length && !warnings.length) warnings.push("No transaction rows were detected in the workbook.");
    return makeImportResult({ transactions, warnings, metadata: { format: "Excel", sheets: sheetInfo, rows: transactions.length } });
  } catch (e) {
    return makeImportResult({ errors: [`Excel parsing failed: ${e.message}`] });
  }
}
