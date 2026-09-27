import { normalizeDate } from "./normalize";

export function isPayslipText(text = "") {
  const s = String(text).toLowerCase();
  return /payslip|salary slip|net pay|gross earnings|total deductions/.test(s);
}

export function parsePayslipPages(pages, source = "payslip") {
  const results = [];
  const warnings = [];
  pages.forEach((text, index) => {
    const s = String(text || "").replace(/\u00a0/g, " ");
    const netMatch = s.match(/net\s*(?:pay|salary|take\s*home)\s*[:\-]?\s*(?:₹|INR|Rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i);
    const dateMatch = s.match(/(?:pay\s*date|salary\s*date|date)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i);
    const employerMatch = s.match(/^\s*([^\n]{2,80}?)(?:\s+\n|\n)/);
    if (!netMatch) return;
    const net = Number(netMatch[1].replace(/,/g, ""));
    const payDate = dateMatch ? normalizeDate(dateMatch[1]) : "";
    const employer = employerMatch?.[1]?.trim() || "Unknown employer";
    results.push({
      id: `payslip_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: payDate || new Date().toISOString().slice(0, 10),
      amount: Math.abs(net),
      currency: "INR",
      raw_description: `Salary · ${employer}`,
      merchant: employer,
      category: "Income",
      source,
      is_recurring: true,
      recurring_group_id: "rec_salary",
      capturedLive: false,
      confidence: 0.98,
      sourceType: "payslip"
    });
  });
  if (!results.length) warnings.push("No Net Pay value was detected in this payslip PDF.");
  return { transactions: results, warnings };
}

export function parsePayslipText(text, source = "payslip") {
  const parsed = parsePayslipPages([text], source);
  const first = parsed.transactions[0];
  return {
    type: "payslip",
    source,
    payDate: first?.date || "",
    employer: first?.merchant || "Unknown employer",
    netSalary: first?.amount || null,
    confidence: first?.confidence || 0.4
  };
}
