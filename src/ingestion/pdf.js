import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";
import { makeImportResult } from "./schema";
import { normalizeRow, normalizeDate, normalizeAmount, normalizeMerchant, guessCategory, recurringSignal } from "./normalize";
import { parsePayslipPages, isPayslipText } from "./payslip";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

async function extractPageText(page) {
  const content = await page.getTextContent();
  const items = content.items || [];
  const rows = [];
  items.forEach(item => {
    const y = Math.round((item.transform?.[5] || 0) / 2) * 2;
    let row = rows.find(r => Math.abs(r.y - y) <= 2);
    if (!row) { row = { y, parts: [] }; rows.push(row); }
    row.parts.push(item.str || "");
  });
  return rows
    .sort((a, b) => b.y - a.y)
    .map(r => r.parts.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function isCardStatement(text) {
  return /credit\s*card|domestic\s*&\s*international\s*transactions|payment\s*due date/i.test(text);
}

function isBankStatement(text) {
  return /statement of account|account statement|withdrawal|deposit|closing balance/i.test(text);
}

function parseCardStatement(text, source) {
  const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const transactions = [];
  let active = false;
  let pending = null;

  for (const line of lines) {
    if (/^date\s+transaction details\s+amount/i.test(line)) { active = true; continue; }
    if (/reward points|pay the total amount|credit limit|statement date|previous balance|minimum amount due/i.test(line)) {
      if (!/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)) active = active && !/reward points|pay the total amount/i.test(line);
      continue;
    }
    if (!active) continue;

    const m = line.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+((?:INR\s*)?[\d,]+(?:\.\d{1,2})?)(?:\s+(Cr|Dr))?$/i);
    if (!m) continue;

    const date = normalizeDate(m[1]);
    const raw = m[2].trim();
    const amount = normalizeAmount(`${m[3]} ${m[4] || ""}`);
    const credit = /\bcr\b/i.test(m[4] || "") || /refund/i.test(raw);
    const payment = /payment received|autopay|thank you/i.test(raw);
    const finalAmount = payment ? -Math.abs(amount) : credit ? Math.abs(amount) : -Math.abs(amount);

    const t = normalizeRow({ Date: date, Description: raw }, {
      source,
      index: transactions.length,
      sourceType: "card_pdf",
      amountOverride: finalAmount,
      categoryOverride: payment ? "Transfer" : undefined
    });
    t.raw_description = raw;
    t.merchant = normalizeMerchant(raw);
    t.category = payment ? "Transfer" : guessCategory(raw, t.merchant, finalAmount);
    t.is_recurring = recurringSignal(raw, finalAmount);
    t.excluded = payment;
    transactions.push(t);
    pending = null;
  }
  return transactions;
}

function parseGenericStatement(text, source) {
  const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const transactions = [];
  const dateRe = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dm = line.match(dateRe);
    if (!dm) continue;
    if (/statement from|statement to|opening balance|closing balance|value date/i.test(line)) continue;

    const rest = line.slice(dm[0].length).trim();
    const amounts = [...rest.matchAll(/(?:₹|INR|Rs\.?\s*)?-?\(?\d[\d,]*(?:\.\d{1,2})?\)?(?:\s*(?:Cr|Dr))?/gi)];
    if (!amounts.length) continue;
    const last = amounts.at(-1);
    const amountToken = last[0];
    let raw = rest.slice(0, last.index).trim();
    if (!raw && i + 1 < lines.length) raw = lines[i + 1];

    // Avoid statement summary lines by requiring a plausible transaction description.
    if (/^(statement|opening|closing|total|minimum|credit limit)/i.test(raw)) continue;
    let amount = normalizeAmount(amountToken);
    const isCredit = /\bcr\b/i.test(amountToken);
    const isPayment = /cc\s*autopay|credit\s*card\s*(payment|bill)/i.test(raw);
    if (isCredit) amount = Math.abs(amount);
    else amount = -Math.abs(amount);
    if (isPayment) amount = -Math.abs(amount);

    const t = normalizeRow({ Date: dm[0], Description: raw || "Statement transaction" }, {
      source,
      index: transactions.length,
      sourceType: "pdf",
      amountOverride: amount
    });
    if (t.amount !== 0) transactions.push(t);
  }
  return transactions;
}

async function ocrPage(page, worker) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: context, viewport }).promise;
  return (await worker.recognize(canvas)).data.text || "";
}

export async function parsePdfFile(file, onProgress) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const text = await extractPageText(await pdf.getPage(p));
      pages.push(text);
      onProgress?.((p / pdf.numPages) * 0.45);
    }

    const fullText = pages.join("\n\n");
    const warnings = [];

    if (isPayslipText(fullText)) {
      const payslip = parsePayslipPages(pages, file.name);
      return makeImportResult({
        transactions: payslip.transactions,
        warnings: payslip.warnings,
        metadata: { format: "Payslip PDF", pages: pdf.numPages, detectedType: "payslip" }
      });
    }

    let transactions = isCardStatement(fullText)
      ? parseCardStatement(fullText, file.name)
      : parseGenericStatement(fullText, file.name);

    if (!transactions.length && isBankStatement(fullText)) {
      warnings.push("The PDF looks like a bank statement but no transaction rows matched its layout.");
    }

    if (!transactions.length) {
      const worker = await createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") onProgress?.(0.45 + (m.progress || 0) * 0.55);
        }
      });
      try {
        const ocrPages = [];
        for (let p = 1; p <= pdf.numPages; p++) ocrPages.push(await ocrPage(await pdf.getPage(p), worker));
        const ocrText = ocrPages.join("\n\n");
        if (isPayslipText(ocrText)) {
          const payslip = parsePayslipPages(ocrPages, file.name);
          transactions = payslip.transactions;
        } else {
          transactions = isCardStatement(ocrText) ? parseCardStatement(ocrText, file.name) : parseGenericStatement(ocrText, file.name);
        }
        if (transactions.length) warnings.push("OCR was used because the PDF did not expose usable transaction text. Review the imported rows.");
        else warnings.push("OCR completed, but no supported transaction rows were detected.");
      } finally {
        await worker.terminate();
      }
    }

    return makeImportResult({
      transactions,
      warnings,
      metadata: {
        format: "PDF",
        pages: pdf.numPages,
        detectedType: isCardStatement(fullText) ? "credit_card_statement" : isBankStatement(fullText) ? "bank_statement" : "document",
        textExtracted: Boolean(fullText.trim()),
        rows: transactions.length
      }
    });
  } catch (e) {
    return makeImportResult({ errors: [`PDF parsing failed: ${e.message}`] });
  }
}
