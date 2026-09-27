import { createWorker } from "tesseract.js";
import { makeImportResult } from "./schema";
import { normalizeDate, normalizeMerchant, guessCategory, recurringSignal } from "./normalize";

export async function parseImageFile(file, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: m => { if (m.status === "recognizing text") onProgress?.(m.progress || 0); }
  });
  try {
    const text = (await worker.recognize(file)).data.text || "";
    const date = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
    const amountMatches = [...text.matchAll(/(?:₹|INR|Rs\.?|\\u20b9)\s*([\d,]+(?:\.\d{1,2})?)/gi)];
    const amount = amountMatches.length ? -Math.abs(Number(amountMatches.at(-1)[1].replace(/,/g, ""))) : 0;
    const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const merchant = normalizeMerchant(lines.find(x => /restaurant|cafe|mart|store|uber|swiggy|zomato|amazon|netflix|spotify|airtel|jio|shop/i.test(x)) || lines[0] || "Receipt");
    const transaction = amount ? {
      id: `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: date ? normalizeDate(date[1]) : new Date().toISOString().slice(0, 10),
      amount,
      currency: "INR",
      raw_description: text.slice(0, 500),
      merchant,
      category: guessCategory(text, merchant, amount),
      source: file.name,
      is_recurring: recurringSignal(text, amount),
      recurring_group_id: null,
      capturedLive: false,
      confidence: 0.65,
      sourceType: "ocr"
    } : null;
    return makeImportResult({
      transactions: transaction ? [transaction] : [],
      warnings: transaction ? ["Receipt was read with OCR. Review the merchant and amount before relying on it."] : ["OCR completed, but no reliable total amount was detected."],
      metadata: { format: "Image/OCR", characters: text.length, ocrText: text }
    });
  } finally {
    await worker.terminate();
  }
}
