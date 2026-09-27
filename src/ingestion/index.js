export const SUPPORTED_EXTENSIONS = ["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "webp", "txt", "eml"];

export function fileKind(file) {
  const ext = file?.name?.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (["xlsx", "xls"].includes(ext)) return "spreadsheet";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (ext === "txt") return "text";
  if (ext === "eml") return "eml";
  return "unsupported";
}

export async function ingestFile(file, options = {}) {
  const kind = fileKind(file);
  if (kind === "unsupported") {
    return { transactions: [], warnings: [], errors: [`Unsupported file type: .${file?.name?.split(".").pop() || "unknown"}`], metadata: {} };
  }
  if (kind === "csv") return (await import("./csv.js")).parseCsvFile(file);
  if (kind === "spreadsheet") return (await import("./xlsx.js")).parseSpreadsheetFile(file);
  if (kind === "pdf") return (await import("./pdf.js")).parsePdfFile(file, options.onProgress);
  if (kind === "image") return (await import("./ocr.js")).parseImageFile(file, options.onProgress);
  if (kind === "eml") return (await import("./eml.js")).parseEmlFile(file);
  if (kind === "text") {
    const { parsePayslipText } = await import("./payslip.js");
    const { makeImportResult } = await import("./schema.js");
    const parsed = parsePayslipText(await file.text(), file.name);
    return makeImportResult({
      transactions: parsed.netSalary ? [{
        id: `payslip_${Date.now()}`,
        date: parsed.payDate || new Date().toISOString().slice(0, 10),
        amount: parsed.netSalary,
        currency: "INR",
        raw_description: `Salary · ${parsed.employer}`,
        merchant: parsed.employer,
        category: "Income",
        source: file.name,
        is_recurring: true,
        recurring_group_id: "rec_salary",
        capturedLive: false,
        confidence: parsed.confidence,
        sourceType: "payslip"
      }] : [],
      warnings: parsed.netSalary ? [] : ["No net salary was detected in this text file."],
      metadata: { format: "Payslip text", payslip: parsed }
    });
  }
}

export async function reconcileAndDetect(transactions, livePayments) {
  const { reconcileAndDetect: fn } = await import("./intelligence.js");
  return fn(transactions, livePayments);
}
