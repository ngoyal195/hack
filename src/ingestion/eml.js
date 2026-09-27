import { makeImportResult } from "./schema";
import { normalizeDate, normalizeMerchant } from "./normalize";

function decodeBase64(value) {
  try {
    const binary = atob(value.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function decodeQuotedPrintable(value) {
  return value.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function header(text, name) {
  const re = new RegExp(`^${name}:\\s*(.*)$`, "im");
  return text.match(re)?.[1]?.trim() || "";
}

export async function parseEmlFile(file) {
  const raw = await file.text();
  const transfer = header(raw, "Content-Transfer-Encoding").toLowerCase();
  let body = raw.split(/\r?\n\r?\n/).slice(1).join("\n\n");
  if (transfer.includes("base64")) body = decodeBase64(body);
  else if (transfer.includes("quoted-printable")) body = decodeQuotedPrintable(body);

  // Synthetic/demo receipts and most plain-text bank alerts fit this simple extraction.
  const amountMatch = body.match(/(?:order\s*total|total|amount\s*(?:paid|debited|charged)?)\s*[:\-]?\s*(?:₹|INR|Rs\.?|\\u20b9)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const dateMatch = body.match(/(?:ordered\s*on|transaction\s*date|paid\s*on|date)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i);
  const subject = header(raw, "Subject");
  const merchantMatch = body.match(/^\s*([A-Za-z][A-Za-z0-9 .&'-]{2,50})\s*$/m);
  const merchant = normalizeMerchant(merchantMatch?.[1] || subject.split(/order|your/i)[0] || file.name.replace(/\.eml$/i, ""));

  if (!amountMatch) {
    return makeImportResult({ warnings: ["Email was read, but no reliable payment amount was detected."], metadata: { format: "EML", subject } });
  }

  const amount = -Math.abs(Number(amountMatch[1].replace(/,/g, "")));
  const transaction = {
    id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: dateMatch ? normalizeDate(dateMatch[1]) : normalizeDate(header(raw, "Date")) || new Date().toISOString().slice(0, 10),
    amount,
    currency: "INR",
    raw_description: subject || body.slice(0, 300),
    merchant,
    category: "Shopping",
    source: file.name,
    is_recurring: false,
    recurring_group_id: null,
    capturedLive: true,
    confidence: 0.92,
    sourceType: "eml",
    emailReceipt: true
  };

  return makeImportResult({ transactions: [transaction], metadata: { format: "EML", subject, from: header(raw, "From") } });
}
