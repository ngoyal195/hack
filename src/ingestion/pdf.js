import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";
import { makeImportResult } from "./schema";
import { normalizeRow } from "./normalize";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

function parseLine(line, index, source) {
  const dm = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
  if (!dm) return null;
  const amounts = [...line.replace(dm[0], "").matchAll(/(?:₹|INR|Rs\.?\s*)?-?\(?\d[\d,]*(?:\.\d{1,2})?\)?/g)]
    .map(x => Number(x[0].replace(/₹|INR|Rs\.?|,/gi, "").replace(/[()]/g, "")))
    .filter(Number.isFinite);
  if (!amounts.length) return null;
  const amount = amounts.at(-1);
  const desc = line.replace(dm[0], "").replace(String(amount), "").replace(/₹|INR|Rs\.?|,/gi, " ").replace(/\s+/g, " ").trim();
  return normalizeRow({ Date: dm[0], Description: desc || line, Amount: amount }, { source, index, sourceType: "pdf" });
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

function transactionsFromText(text, source) {
  const lines = text.split(/\n+/).flatMap(x => x.split(/(?=\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/)).map(x => x.trim()).filter(Boolean);
  const transactions = [];
  lines.forEach((line, i) => {
    const t = parseLine(line, i, source);
    if (t && t.amount !== 0) transactions.push(t);
  });
  return transactions;
}

export async function parsePdfFile(file, onProgress) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    const pageTexts = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      const pageText = content.items.map(x => x.str).join(" ");
      pageTexts.push(pageText);
      text += `${pageText}\n`;
      onProgress?.((p / pdf.numPages) * 0.5);
    }

    let transactions = transactionsFromText(text, file.name);
    const warnings = [];

    if (!transactions.length) {
      const worker = await createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") onProgress?.(0.5 + (m.progress || 0) * 0.5);
        }
      });
      try {
        let ocrText = "";
        for (let p = 1; p <= pdf.numPages; p++) {
          ocrText += `${await ocrPage(await pdf.getPage(p), worker)}\n`;
        }
        transactions = transactionsFromText(ocrText, file.name);
        if (!transactions.length) warnings.push("PDF OCR completed, but no transaction-like rows were detected.");
        else warnings.push("This PDF was read with OCR because no usable text layer was found. Please review the normalized rows.");
      } finally {
        await worker.terminate();
      }
    }

    if (!transactions.length) warnings.push("No transaction rows were detected. The PDF may use an unsupported layout or require manual review.");
    return makeImportResult({
      transactions,
      warnings,
      metadata: { format: "PDF", pages: pdf.numPages, textExtracted: pageTexts.some(Boolean), ocrFallbackUsed: !pageTexts.some(Boolean) || !transactionsFromText(text, file.name).length }
    });
  } catch (e) {
    return makeImportResult({ errors: [`PDF parsing failed: ${e.message}`] });
  }
}
