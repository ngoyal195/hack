export const SUPPORTED_EXTENSIONS = ["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "webp", "txt"];

export function fileKind(file) {
  const ext = file?.name?.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (["xlsx", "xls"].includes(ext)) return "spreadsheet";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (ext === "txt") return "text";
  return "unsupported";
}

export async function ingestFile(file, options = {}) {
  const kind = fileKind(file);

  if (kind === "unsupported") {
    return {
      transactions: [],
      warnings: [],
      errors: [`Unsupported file type: .${file?.name?.split(".").pop() || "unknown"}`],
      metadata: {}
    };
  }

  if (kind === "csv") {
    const { parseCsvFile } = await import("./csv.js");
    return parseCsvFile(file);
  }

  if (kind === "spreadsheet") {
    const { parseSpreadsheetFile } = await import("./xlsx.js");
    return parseSpreadsheetFile(file);
  }

  if (kind === "pdf") {
    const { parsePdfFile } = await import("./pdf.js");
    return parsePdfFile(file, options.onProgress);
  }

  if (kind === "image") {
    const { parseImageFile } = await import("./ocr.js");
    return parseImageFile(file, options.onProgress);
  }

  if (kind === "text") {
    const { parsePayslipText } = await import("./payslip.js");
    const { makeImportResult } = await import("./schema.js");
    const text = await file.text();
    const payslip = parsePayslipText(text, file.name);
    const transaction = payslip.netSalary
      ? {
          id: `payslip_${Date.now()}`,
          date: payslip.payDate || new Date().toISOString().slice(0, 10),
          amount: payslip.netSalary,
          currency: "INR",
          raw_description: `Salary · ${payslip.employer || "Employer"}`,
          merchant: payslip.employer || "Salary",
          category: "Income",
          source: file.name,
          is_recurring: true,
          recurring_group_id: "rec_salary",
          capturedLive: false,
          confidence: payslip.confidence,
          sourceType: "payslip"
        }
      : null;

    return makeImportResult({
      transactions: transaction ? [transaction] : [],
      warnings: transaction ? [] : ["No net salary was detected in this text file."],
      errors: [],
      metadata: { format: "Payslip text", payslip }
    });
  }
}

export async function reconcileAndDetect(transactions, livePayments) {
  const { reconcileAndDetect: fn } = await import("./intelligence.js");
  return fn(transactions, livePayments);
}
