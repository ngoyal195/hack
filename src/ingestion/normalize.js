const MERCHANT_RULES = [
  ["Netflix", /netflix|streamflix/i],
  ["Spotify", /spotify|tunely premium/i],
  ["JioHotstar", /hotstar|jio.?hotstar|vidmax/i],
  ["Amazon Prime", /amazon\s*prime/i],
  ["Amazon", /amazon|amzn/i],
  ["ShopZone", /shopzone/i],
  ["QuickKart", /quickkart/i],
  ["FoodDash", /fooddash/i],
  ["Swiggy", /swiggy/i],
  ["Zomato", /zomato/i],
  ["RideNow", /ridenow|ride.?now/i],
  ["Uber", /uber/i],
  ["Ola", /ola\b/i],
  ["Bharat Fuels", /bharat\s*fuels|fuel\s*station|petrol/i],
  ["PhoneHub Electronics", /phonehub/i],
  ["The Filter Kapi House", /filter\s*kapi/i],
  ["Hops and Barley", /hops\s*and\s*barley/i],
  ["Meghana Biryani", /meghana\s*biryani/i],
  ["CloudCode Pro", /cloudcode/i],
  ["ProNet", /pronet/i],
  ["AirLink Fiber", /airlink\s*fiber/i],
  ["MetroPower", /metropower/i],
  ["Airtel", /airtel/i],
  ["Jio", /jio|reliance\s*jio/i],
  ["Gym", /gym|fitness|cult/i],
  ["Rent", /rent|house\s*rent/i],
  ["Salary", /salary|payroll|sal\s*credit/i]
];

const TRANSFER_RULES = [
  /self\s*transfer/i,
  /own\s*account/i,
  /transfer\s*to\s*self/i,
  /cc\s*autopay|credit\s*card\s*(payment|bill)/i,
  /card\s*payment/i,
  /wallet\s*(top.?up|add\s*money)/i,
  /add\s*money/i,
  /pocketpay/i
];

export function isTransfer(raw = "") {
  return TRANSFER_RULES.some(r => r.test(String(raw)));
}

export function normalizeMerchant(raw = "") {
  const value = String(raw).replace(/\s+/g, " ").trim();
  for (const [merchant, rule] of MERCHANT_RULES) if (rule.test(value)) return merchant;

  const parts = value
    .split(/[|/\\*]/)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => !/^(upi|imps|neft|nach|ecs|pos|txn|ref|pay|debit|credit|payment|autopay)$/i.test(x));

  const candidate = parts.find(x => !/^[A-Z0-9@._-]{10,}$/.test(x)) || parts[0] || value;
  return (candidate || "Unknown merchant").replace(/[_-]+/g, " ").slice(0, 70);
}

export function guessCategory(raw = "", merchant = "", amount = 0) {
  const s = `${raw} ${merchant}`.toLowerCase();

  if (/salary|payroll|net pay|income|salary credit/.test(s) && amount > 0) return "Income";
  if (isTransfer(s)) return "Transfer";
  if (/rent|lease|housing/.test(s)) return "Housing";
  if (/emi|loan|bajaj finance|phonehub.*prin\+int/.test(s)) return "EMIs & Loans";
  if (/sip|mutual fund|\bmf\b|investment|zerodha|groww|ppf|nps|recurring deposit/.test(s)) return "Investments & Savings";
  if (/netflix|spotify|hotstar|prime|google one|youtube|subscription|ott|tunely|streamflix/.test(s)) return "Subscriptions & Entertainment";
  if (/blinkit|zepto|bigbasket|dmart|quickkart|grocer/.test(s)) return "Groceries";
  if (/swiggy|zomato|fooddash|restaurant|food|domino|mcdonald|starbucks|cafe|kapi|biryani|brewpub/.test(s)) return "Food & Dining";
  if (/amazon|shopzone|flipkart|myntra|shopping|mall|retail|store/.test(s)) return "Shopping";
  if (/uber|ola|ridenow|rapido|metro|petrol|fuel|parking|transport/.test(s)) return "Transport";
  if (/airtel|jio|electric|water|gas|broadband|fiber|utility|metropower/.test(s)) return "Bills & Utilities";
  if (/gym|fitness|health|pharmacy|hospital|apollo|insurance/.test(s)) return "Health";
  if (/travel|hotel|flight|airline|booking/.test(s)) return "Travel";
  return amount > 0 ? "Other" : "Other";
}

export function normalizeDate(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20000 && value < 70000) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function normalizeAmount(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let s = String(value).trim();
  const credit = /\bcr\.?\b/i.test(s);
  const debit = /\bdr\.?\b/i.test(s);
  const negative = /^\s*-/.test(s) || /^\s*\(/.test(s);
  s = s.replace(/[₹$€£]|INR|Rs\.?/gi, "").replace(/,/g, "").replace(/\s+/g, "").replace(/\b(cr|dr)\.?\b/gi, "");
  const n = Number(s.replace(/[()]/g, ""));
  if (!Number.isFinite(n)) return 0;
  if (credit) return Math.abs(n);
  if (debit) return -Math.abs(n);
  if (negative || /^\(/.test(String(value).trim())) return -Math.abs(n);
  return n;
}

export function recurringSignal(raw = "", amount = 0) {
  const s = String(raw);
  return /autopay|auto\s*debit|nach|ecs|standing\s*instruction|recurring|subscription|emi|sip|monthly|annual|renewal/i.test(s)
    || (Math.abs(amount) >= 2000 && /loan|rent|salary|sip/i.test(s));
}

function lowerMap(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [String(k).toLowerCase().trim(), v]));
}

export function normalizeRow(row, { source = "import", index = 0, sourceType = "statement", amountOverride = null, categoryOverride = null } = {}) {
  const lower = lowerMap(row);
  const pick = (...names) => {
    const key = names.map(x => x.toLowerCase()).find(x => lower[x] !== undefined && String(lower[x]).trim() !== "");
    return key ? lower[key] : "";
  };

  const raw = pick(
    "description", "narration", "transaction details", "transaction details / narration",
    "details", "remarks", "merchant", "particulars", "memo", "payee"
  ) || "Imported transaction";
  const date = normalizeDate(pick("date", "transaction date", "value date", "posting date", "txn date", "transaction_date"));

  let amount = amountOverride == null ? normalizeAmount(pick("amount", "transaction amount", "value")) : Number(amountOverride);
  if (!amount) {
    const withdrawal = pick("withdrawal amt.", "withdrawal amount", "withdrawal", "debit amount", "debit");
    const deposit = pick("deposit amt.", "deposit amount", "deposit", "credit amount", "credit");
    if (withdrawal !== "") amount = -Math.abs(normalizeAmount(withdrawal));
    else if (deposit !== "") amount = Math.abs(normalizeAmount(deposit));
  }

  const merchant = normalizeMerchant(raw);
  const category = categoryOverride || guessCategory(raw, merchant, amount);
  const recurring = recurringSignal(raw, amount);
  const transfer = category === "Transfer";

  return {
    id: `${source.replace(/\W/g, "_")}_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: date || new Date().toISOString().slice(0, 10),
    amount,
    currency: "INR",
    raw_description: String(raw),
    merchant,
    category,
    source,
    is_recurring: recurring,
    recurring_group_id: recurring ? `rec_${merchant.toLowerCase().replace(/\W+/g, "_")}` : null,
    capturedLive: false,
    confidence: merchant !== "Unknown merchant" ? 0.9 : 0.55,
    sourceType,
    excluded: transfer,
    upiRef: pick("upi ref", "upi reference", "reference", "ref no", "chq./ref.no.", "chq./ref.no") || undefined
  };
}
