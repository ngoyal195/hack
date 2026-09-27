import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Papa from "papaparse";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  Home,
  IndianRupee,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import "./styles.css";

/* =========================================================
   DEMO DATA
========================================================= */

const initialTransactions = [
  {
    id: "txn_001",
    date: "2026-09-03",
    amount: -649,
    currency: "INR",
    raw_description: "UPI/NETFLIX.COM/402918xx/AUTOPAY",
    merchant: "Netflix",
    category: "Entertainment",
    source: "hdfc_savings_csv",
    is_recurring: true,
    recurring_group_id: "rec_netflix",
  },
  {
    id: "txn_002",
    date: "2026-09-04",
    amount: -1599,
    currency: "INR",
    raw_description: "UPI/ZOMATO/783219xx",
    merchant: "Zomato",
    category: "Food",
    source: "hdfc_savings_csv",
    is_recurring: false,
    recurring_group_id: null,
  },
  {
    id: "txn_003",
    date: "2026-09-05",
    amount: -299,
    currency: "INR",
    raw_description: "UPI/SPOTIFY/118923xx/AUTOPAY",
    merchant: "Spotify",
    category: "Entertainment",
    source: "hdfc_savings_csv",
    is_recurring: true,
    recurring_group_id: "rec_spotify",
  },
  {
    id: "txn_004",
    date: "2026-09-06",
    amount: -2200,
    currency: "INR",
    raw_description: "UPI/SWIGGY/229188xx",
    merchant: "Swiggy",
    category: "Food",
    source: "hdfc_savings_csv",
    is_recurring: false,
    recurring_group_id: null,
  },
  {
    id: "txn_005",
    date: "2026-09-07",
    amount: -799,
    currency: "INR",
    raw_description: "UPI/AMAZON/992813xx",
    merchant: "Amazon",
    category: "Shopping",
    source: "hdfc_savings_csv",
    is_recurring: false,
    recurring_group_id: null,
  },
  {
    id: "txn_006",
    date: "2026-09-08",
    amount: -2499,
    currency: "INR",
    raw_description: "NACH/ICICI/HDFC EMI",
    merchant: "HDFC Bank",
    category: "EMI",
    source: "hdfc_savings_csv",
    is_recurring: true,
    recurring_group_id: "rec_emi",
  },
  {
    id: "txn_007",
    date: "2026-09-09",
    amount: -149,
    currency: "INR",
    raw_description: "UPI/GOOGLE*ONE/382918xx/AUTOPAY",
    merchant: "Google One",
    category: "Subscriptions",
    source: "hdfc_savings_csv",
    is_recurring: true,
    recurring_group_id: "rec_google",
  },
];

const initialSubscriptions = [
  {
    id: "sub_001",
    merchant: "Netflix",
    category: "Entertainment",
    amount: 649,
    frequency: "monthly",
    nextCharge: "2026-10-03",
    lastCharge: "2026-09-03",
    priceChange: false,
    forgotten: false,
    status: "active",
  },
  {
    id: "sub_002",
    merchant: "Spotify",
    category: "Entertainment",
    amount: 299,
    frequency: "monthly",
    nextCharge: "2026-10-05",
    lastCharge: "2026-09-05",
    priceChange: true,
    previousAmount: 199,
    forgotten: false,
    status: "active",
  },
  {
    id: "sub_003",
    merchant: "Google One",
    category: "Cloud Storage",
    amount: 149,
    frequency: "monthly",
    nextCharge: "2026-10-09",
    lastCharge: "2026-09-09",
    priceChange: false,
    forgotten: true,
    status: "active",
  },
  {
    id: "sub_004",
    merchant: "Amazon Prime",
    category: "Shopping",
    amount: 1499,
    frequency: "annual",
    nextCharge: "2027-02-14",
    lastCharge: "2026-02-14",
    priceChange: false,
    forgotten: true,
    status: "active",
  },
];

const initialCommitments = [
  {
    id: "commit_001",
    title: "HDFC Personal Loan EMI",
    merchant: "HDFC Bank",
    amount: 2499,
    date: "2026-09-28",
    type: "EMI",
  },
  {
    id: "commit_002",
    title: "House Rent",
    merchant: "Rent",
    amount: 22000,
    date: "2026-10-01",
    type: "Rent",
  },
  {
    id: "commit_003",
    title: "SBI Mutual Fund SIP",
    merchant: "SBI Mutual Fund",
    amount: 5000,
    date: "2026-10-05",
    type: "SIP",
  },
  {
    id: "commit_004",
    title: "Netflix",
    merchant: "Netflix",
    amount: 649,
    date: "2026-10-03",
    type: "Subscription",
  },
  {
    id: "commit_005",
    title: "Spotify",
    merchant: "Spotify",
    amount: 299,
    date: "2026-10-05",
    type: "Subscription",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatShortDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const categoryIcon = (category) => {
  const icons = {
    Food: "🍔",
    Entertainment: "🎬",
    Shopping: "🛍️",
    EMI: "🏦",
    Subscriptions: "🔁",
    Travel: "✈️",
    Bills: "📄",
    Health: "💊",
    Other: "💳",
  };

  return icons[category] || "💳";
};

const guessMerchant = (text) => {
  const value = text.toLowerCase();

  if (value.includes("netflix")) return "Netflix";
  if (value.includes("spotify")) return "Spotify";
  if (value.includes("zomato")) return "Zomato";
  if (value.includes("swiggy")) return "Swiggy";
  if (value.includes("amazon")) return "Amazon";
  if (value.includes("google")) return "Google One";
  if (value.includes("hdfc")) return "HDFC Bank";
  if (value.includes("sbi")) return "SBI";
  if (value.includes("uber")) return "Uber";
  if (value.includes("ola")) return "Ola";

  return text
    .replace(/upi\/|nach\/|neft\/|imps\/|autopay/gi, "")
    .split("/")
    .filter(Boolean)[0]
    ?.trim() || "Unknown Merchant";
};

const guessCategory = (merchant) => {
  const value = merchant.toLowerCase();

  if (["zomato", "swiggy"].some((x) => value.includes(x))) return "Food";
  if (
    ["netflix", "spotify", "prime", "google"].some((x) =>
      value.includes(x)
    )
  )
    return "Entertainment";
  if (["amazon", "flipkart", "myntra"].some((x) => value.includes(x)))
    return "Shopping";
  if (value.includes("hdfc")) return "EMI";

  return "Other";
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [activePage, setActivePage] = useState("home");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [commitments] = useState(initialCommitments);
  const [livePayments, setLivePayments] = useState([]);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const income = 85000;

  const spent = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.amount < 0)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    [transactions]
  );

  const committed = useMemo(
    () => commitments.reduce((sum, item) => sum + item.amount, 0),
    [commitments]
  );

  const freeToSpend = Math.max(income - spent - committed, 0);

  const addLivePayment = (payment) => {
    const newPayment = {
      ...payment,
      id: `live_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
    };

    setLivePayments((current) => [newPayment, ...current]);
  };

  const cancelSubscription = (id) => {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === id
          ? { ...subscription, status: "review" }
          : subscription
      )
    );
  };

  const importTransactions = (rows) => {
    const imported = rows
      .map((row, index) => {
        const date =
          row.date ||
          row.Date ||
          row["Transaction Date"] ||
          row["Value Date"] ||
          "";

        const description =
          row.description ||
          row.Description ||
          row["Transaction Details"] ||
          row["Narration"] ||
          row["Description"] ||
          "";

        const rawAmount =
          row.amount ||
          row.Amount ||
          row["Transaction Amount"] ||
          row["Withdrawal Amount"] ||
          "";

        const amount = Number(String(rawAmount).replace(/[₹,\s]/g, ""));

        if (!date || !description || Number.isNaN(amount)) return null;

        const merchant = guessMerchant(description);

        return {
          id: `import_${Date.now()}_${index}`,
          date,
          amount: amount > 0 ? -amount : amount,
          currency: "INR",
          raw_description: description,
          merchant,
          category: guessCategory(merchant),
          source: "csv_import",
          is_recurring: /autopay|nach|recurring|subscription|emi|sip/i.test(
            description
          ),
          recurring_group_id: null,
        };
      })
      .filter(Boolean);

    setTransactions((current) => [...imported, ...current]);
  };

  return (
    <div className="app">
      <aside className={`sidebar ${showMobileNav ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Wallet size={20} />
          </div>
          <div>
            <div className="brand-name">CommitWise</div>
            <div className="brand-subtitle">Spend with clarity</div>
          </div>
        </div>

        <nav className="navigation">
          <NavItem
            icon={<Home size={18} />}
            label="Overview"
            active={activePage === "home"}
            onClick={() => {
              setActivePage("home");
              setShowMobileNav(false);
            }}
          />

          <NavItem
            icon={<Clock3 size={18} />}
            label="Live Log"
            active={activePage === "live"}
            onClick={() => {
              setActivePage("live");
              setShowMobileNav(false);
            }}
          />

          <NavItem
            icon={<CalendarDays size={18} />}
            label="Commitments"
            active={activePage === "commitments"}
            onClick={() => {
              setActivePage("commitments");
              setShowMobileNav(false);
            }}
          />

          <NavItem
            icon={<RefreshCw size={18} />}
            label="Subscriptions"
            active={activePage === "subscriptions"}
            onClick={() => {
              setActivePage("subscriptions");
              setShowMobileNav(false);
            }}
          />

          <NavItem
            icon={<FileText size={18} />}
            label="Statements"
            active={activePage === "statements"}
            onClick={() => {
              setActivePage("statements");
              setShowMobileNav(false);
            }}
          />
        </nav>

        <div className="sidebar-bottom">
          <div className="trust-card">
            <ShieldCheck size={18} />
            <div>
              <strong>Private by design</strong>
              <span>Your demo data stays in this browser.</span>
            </div>
          </div>

          <button className="sidebar-settings">
            <Settings size={17} />
            Settings
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setShowMobileNav((value) => !value)}
          >
            <Menu size={21} />
          </button>

          <div>
            <div className="eyebrow">September 2026</div>
            <h1>
              {activePage === "home" && "Your money, before you spend it."}
              {activePage === "live" && "Live spending log"}
              {activePage === "commitments" && "Upcoming commitments"}
              {activePage === "subscriptions" && "Subscription manager"}
              {activePage === "statements" && "Statement reconciliation"}
            </h1>
          </div>

          <div className="topbar-actions">
            <button className="icon-button">
              <Bell size={19} />
            </button>
            <div className="avatar">NG</div>
          </div>
        </header>

        <div className="content">
          {activePage === "home" && (
            <HomePage
              income={income}
              spent={spent}
              committed={committed}
              freeToSpend={freeToSpend}
              transactions={transactions}
              subscriptions={subscriptions}
              commitments={commitments}
              setActivePage={setActivePage}
            />
          )}

          {activePage === "live" && (
            <LiveLogPage
              payments={livePayments}
              addPayment={addLivePayment}
            />
          )}

          {activePage === "commitments" && (
            <CommitmentsPage commitments={commitments} />
          )}

          {activePage === "subscriptions" && (
            <SubscriptionsPage
              subscriptions={subscriptions}
              cancelSubscription={cancelSubscription}
            />
          )}

          {activePage === "statements" && (
            <StatementsPage
              transactions={transactions}
              importTransactions={importTransactions}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   NAVIGATION
========================================================= */

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} className="nav-arrow" />}
    </button>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomePage({
  income,
  spent,
  committed,
  freeToSpend,
  transactions,
  subscriptions,
  commitments,
  setActivePage,
}) {
  const recurringMonthly = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => {
      if (item.frequency === "annual") return sum + item.amount / 12;
      return sum + item.amount;
    }, 0);

  return (
    <>
      <section className="hero-card">
        <div>
          <div className="hero-label">
            <Sparkles size={15} />
            FREE TO SPEND THIS MONTH
          </div>

          <div className="hero-number">{currency(freeToSpend)}</div>

          <p>
            After accounting for your spending and known commitments, this is
            what remains available.
          </p>
        </div>

        <div className="hero-orbit">
          <Wallet size={36} />
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="Monthly income"
          value={currency(income)}
          icon={<TrendingUp size={19} />}
          positive
        />

        <MetricCard
          title="Spent so far"
          value={currency(spent)}
          icon={<TrendingDown size={19} />}
        />

        <MetricCard
          title="Committed"
          value={currency(committed)}
          icon={<CalendarDays size={19} />}
        />

        <MetricCard
          title="Recurring monthly"
          value={currency(recurringMonthly)}
          icon={<RefreshCw size={19} />}
        />
      </section>

      <div className="section-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">RECENT ACTIVITY</div>
              <h2>Latest transactions</h2>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage("statements")}
            >
              View all
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="transaction-list">
            {transactions.slice(0, 6).map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">NEXT 30 DAYS</div>
              <h2>Upcoming commitments</h2>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage("commitments")}
            >
              Timeline
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="commitment-preview">
            {commitments.slice(0, 4).map((item) => (
              <div className="mini-commitment" key={item.id}>
                <div className="date-chip">
                  <span>{new Date(item.date).getDate()}</span>
                  <small>
                    {new Date(item.date).toLocaleDateString("en-IN", {
                      month: "short",
                    })}
                  </small>
                </div>

                <div className="mini-commitment-info">
                  <strong>{item.title}</strong>
                  <span>{item.type}</span>
                </div>

                <strong>{currency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="insight-card">
        <div className="insight-icon">
          <CircleAlert size={20} />
        </div>

        <div>
          <div className="section-kicker">COMMITWISE INSIGHT</div>
          <h3>You have {currency(recurringMonthly)} of recurring monthly costs.</h3>
          <p>
            Two subscriptions need a closer look because their price changed
            or they may no longer be actively used.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() => setActivePage("subscriptions")}
        >
          Review subscriptions
        </button>
      </section>
    </>
  );
}

function MetricCard({ title, value, icon, positive }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${positive ? "positive" : ""}`}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   TRANSACTION ROW
========================================================= */

function TransactionRow({ transaction }) {
  return (
    <div className="transaction-row">
      <div className="transaction-icon">
        {categoryIcon(transaction.category)}
      </div>

      <div className="transaction-main">
        <strong>{transaction.merchant}</strong>
        <span>
          {formatShortDate(transaction.date)} · {transaction.category}
        </span>
      </div>

      <div className="transaction-right">
        <strong className={transaction.amount < 0 ? "expense" : "income"}>
          {transaction.amount < 0 ? "-" : "+"}
          {currency(transaction.amount)}
        </strong>

        {transaction.is_recurring && (
          <span className="recurring-pill">Recurring</span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   LIVE LOG
========================================================= */

function LiveLogPage({ payments, addPayment }) {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");

  const submit = (event) => {
    event.preventDefault();

    if (!merchant || !amount) return;

    addPayment({
      merchant,
      amount: -Math.abs(Number(amount)),
      category,
      note,
      location,
    });

    setMerchant("");
    setAmount("");
    setNote("");
    setLocation("");
  };

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="section-kicker">CAPTURE IT WHILE IT'S FRESH</div>
          <h2>What did you spend today?</h2>
          <p>
            Log a payment in a few seconds. CommitWise keeps it in your live
            spending log before it gets lost in a statement.
          </p>
        </div>

        <div className="live-status">
          <span className="status-dot" />
          Live capture enabled
        </div>
      </div>

      <div className="live-layout">
        <section className="panel capture-panel">
          <div className="panel-header">
            <div>
              <h2>Add payment</h2>
              <span className="muted">Takes less than 10 seconds.</span>
            </div>
          </div>

          <form onSubmit={submit} className="payment-form">
            <label>
              Merchant
              <div className="input-with-icon">
                <Search size={17} />
                <input
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="e.g. Zomato"
                />
              </div>
            </label>

            <label>
              Amount
              <div className="input-with-icon">
                <IndianRupee size={17} />
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                />
              </div>
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Food</option>
                <option>Entertainment</option>
                <option>Shopping</option>
                <option>Travel</option>
                <option>Bills</option>
                <option>Health</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Note
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
              />
            </label>

            <label>
              Location
              <div className="input-with-icon">
                <MapPin size={17} />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Bandra"
                />
              </div>
            </label>

            <button className="primary-button full-width" type="submit">
              <Plus size={18} />
              Capture payment
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">TODAY</div>
              <h2>Captured payments</h2>
            </div>

            <span className="count-pill">{payments.length}</span>
          </div>

          {payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Clock3 size={24} />
              </div>
              <h3>No live payments yet</h3>
              <p>
                Add your first payment using the form. This is the “live log”
                part of the CommitWise story.
              </p>
            </div>
          ) : (
            <div className="transaction-list">
              {payments.map((payment) => (
                <div className="transaction-row" key={payment.id}>
                  <div className="transaction-icon">
                    {categoryIcon(payment.category)}
                  </div>

                  <div className="transaction-main">
                    <strong>{payment.merchant}</strong>
                    <span>
                      {payment.category}
                      {payment.location ? ` · ${payment.location}` : ""}
                    </span>
                  </div>

                  <strong className="expense">
                    -{currency(payment.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* =========================================================
   COMMITMENTS
========================================================= */

function CommitmentsPage({ commitments }) {
  const sorted = [...commitments].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const total = commitments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="section-kicker">KNOWN OUTFLOWS</div>
          <h2>Your next 30 days</h2>
          <p>
            See fixed payments before they hit your account, so “free to
            spend” means something useful.
          </p>
        </div>

        <div className="summary-number">
          <span>Total committed</span>
          <strong>{currency(total)}</strong>
        </div>
      </div>

      <section className="panel timeline-panel">
        <div className="timeline">
          {sorted.map((item, index) => (
            <div className="timeline-item" key={item.id}>
              <div className="timeline-marker">
                <div className="timeline-dot" />
                {index !== sorted.length - 1 && (
                  <div className="timeline-line" />
                )}
              </div>

              <div className="timeline-card">
                <div className="timeline-date">
                  <span>{new Date(item.date).getDate()}</span>
                  <small>
                    {new Date(item.date).toLocaleDateString("en-IN", {
                      month: "short",
                    })}
                  </small>
                </div>

                <div className="timeline-info">
                  <strong>{item.title}</strong>
                  <span>
                    {item.merchant} · {item.type}
                  </span>
                </div>

                <strong className="timeline-amount">
                  {currency(item.amount)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   SUBSCRIPTIONS
========================================================= */

function SubscriptionsPage({ subscriptions, cancelSubscription }) {
  const active = subscriptions.filter((item) => item.status === "active");

  const monthlyCost = active.reduce((sum, item) => {
    return sum + (item.frequency === "annual" ? item.amount / 12 : item.amount);
  }, 0);

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="section-kicker">RECURRING SPEND</div>
          <h2>Subscriptions you might forget</h2>
          <p>
            Recurring charges, upcoming renewals, price changes and potential
            cancellations in one place.
          </p>
        </div>

        <div className="summary-number">
          <span>Monthly equivalent</span>
          <strong>{currency(monthlyCost)}</strong>
        </div>
      </div>

      <div className="subscription-grid">
        {subscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
            onCancel={() => cancelSubscription(subscription.id)}
          />
        ))}
      </div>
    </>
  );
}

function SubscriptionCard({ subscription, onCancel }) {
  const isReview = subscription.status === "review";

  return (
    <article className={`subscription-card ${isReview ? "reviewed" : ""}`}>
      <div className="subscription-top">
        <div className="merchant-logo">
          {subscription.merchant.charAt(0)}
        </div>

        <div>
          <strong>{subscription.merchant}</strong>
          <span>{subscription.category}</span>
        </div>

        <button className="more-button">•••</button>
      </div>

      <div className="subscription-price">
        <strong>{currency(subscription.amount)}</strong>
        <span>/{subscription.frequency === "annual" ? "year" : "month"}</span>
      </div>

      <div className="subscription-next">
        <CalendarDays size={15} />
        Next charge {formatDate(subscription.nextCharge)}
      </div>

      <div className="flag-list">
        {subscription.priceChange && (
          <div className="warning-flag">
            <TrendingUp size={14} />
            Price increased from {currency(subscription.previousAmount)}
          </div>
        )}

        {subscription.forgotten && (
          <div className="warning-flag muted-warning">
            <CircleAlert size={14} />
            You may have forgotten about this
          </div>
        )}
      </div>

      <div className="subscription-actions">
        <button className="secondary-button">Keep</button>

        <button className="danger-button" onClick={onCancel}>
          {isReview ? "Marked for review" : "Cancel / review"}
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   STATEMENTS
========================================================= */

function StatementsPage({ transactions, importTransactions }) {
  const [dragging, setDragging] = useState(false);
  const [imported, setImported] = useState(false);

  const liveMerchantNames = new Set(
    transactions.map((transaction) => transaction.merchant.toLowerCase())
  );

  const uncaptured = [
    {
      merchant: "Uber",
      amount: 428,
      date: "2026-09-11",
      description: "UPI/UBER/91822xx",
    },
    {
      merchant: "Airtel",
      amount: 799,
      date: "2026-09-12",
      description: "NACH/AIRTEL/AUTOPAY",
    },
  ];

  const processFile = (file) => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        importTransactions(results.data);
        setImported(true);
      },
    });
  };

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="section-kicker">RECONCILIATION</div>
          <h2>Statement vs. live log</h2>
          <p>
            Upload a bank statement and CommitWise checks what happened in the
            statement against what you captured live.
          </p>
        </div>

        <div className="statement-status">
          <ShieldCheck size={17} />
          Local browser demo
        </div>
      </div>

      <section
        className={`upload-zone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          processFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="upload-icon">
          <Upload size={25} />
        </div>

        <h3>Drop your CSV statement here</h3>
        <p>HDFC, ICICI, SBI-style CSV files are supported in this prototype.</p>

        <label className="primary-button upload-button">
          <Upload size={17} />
          Choose CSV
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(event) => processFile(event.target.files[0])}
          />
        </label>

        {imported && (
          <div className="upload-success">
            <Check size={16} />
            Statement imported and normalized.
          </div>
        )}
      </section>

      <div className="metric-grid statement-metrics">
        <MetricCard
          title="Transactions in log"
          value={transactions.length}
          icon={<FileText size={19} />}
        />

        <MetricCard
          title="Recurring detected"
          value={transactions.filter((x) => x.is_recurring).length}
          icon={<RefreshCw size={19} />}
        />

        <MetricCard
          title="Live coverage"
          value="87%"
          icon={<ShieldCheck size={19} />}
          positive
        />

        <MetricCard
          title="Needs review"
          value={uncaptured.length}
          icon={<CircleAlert size={19} />}
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-kicker">FLAGGED</div>
            <h2>Charges not captured live</h2>
          </div>

          <span className="warning-count">
            {uncaptured.length} to review
          </span>
        </div>

        <div className="transaction-list">
          {uncaptured.map((item) => (
            <div className="transaction-row flagged-row" key={item.description}>
              <div className="transaction-icon warning-icon">
                <CircleAlert size={18} />
              </div>

              <div className="transaction-main">
                <strong>{item.merchant}</strong>
                <span>
                  {formatDate(item.date)} · {item.description}
                </span>
              </div>

              <div className="transaction-right">
                <strong className="expense">
                  -{currency(item.amount)}
                </strong>
                <span className="review-pill">Never captured live</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-kicker">NORMALIZED DATA</div>
            <h2>Common transaction schema</h2>
          </div>
        </div>

        <div className="schema-table-wrapper">
          <table className="schema-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Recurring</th>
                <th>Source</th>
              </tr>
            </thead>

            <tbody>
              {transactions.slice(0, 8).map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatShortDate(transaction.date)}</td>
                  <td>
                    <strong>{transaction.merchant}</strong>
                  </td>
                  <td className="expense">
                    {currency(transaction.amount)}
                  </td>
                  <td>
                    <span className="category-tag">
                      {transaction.category}
                    </span>
                  </td>
                  <td>
                    {transaction.is_recurring ? (
                      <span className="yes-tag">Yes</span>
                    ) : (
                      <span className="no-tag">No</span>
                    )}
                  </td>
                  <td>{transaction.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
