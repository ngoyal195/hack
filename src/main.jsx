import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Papa from "papaparse";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  IndianRupee,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  WalletCards,
  X,
  Zap
} from "lucide-react";
import "./styles.css";

const TODAY = new Date("2026-09-27T12:00:00");
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(Number(n) || 0));

const seedTransactions = [
  { id:"txn_001", date:"2026-09-03", amount:-649, currency:"INR", raw_description:"UPI/NETFLIX.COM/402918xx/AUTOPAY", merchant:"Netflix", category:"Entertainment", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_netflix", capturedLive:true },
  { id:"txn_002", date:"2026-09-05", amount:-299, currency:"INR", raw_description:"UPI/SPOTIFY/99283/AUTOPAY", merchant:"Spotify", category:"Entertainment", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_spotify", capturedLive:true },
  { id:"txn_003", date:"2026-09-07", amount:-899, currency:"INR", raw_description:"SWIGGY ONE MEMBERSHIP", merchant:"Swiggy One", category:"Food", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_swiggy", capturedLive:true },
  { id:"txn_004", date:"2026-09-10", amount:-2450, currency:"INR", raw_description:"NACH/PHONE EMI/BAJAJ/EMI 04", merchant:"Phone EMI", category:"EMI", source:"icici_credit_card_csv", is_recurring:true, recurring_group_id:"rec_phone_emi", capturedLive:false },
  { id:"txn_005", date:"2026-09-11", amount:-12000, currency:"INR", raw_description:"SI/RENT/NEFT", merchant:"Rent", category:"Housing", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_rent", capturedLive:true },
  { id:"txn_006", date:"2026-09-12", amount:-5000, currency:"INR", raw_description:"SIP/NACH/MIRAE ASSET", merchant:"Mirae Asset SIP", category:"Investments", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_sip", capturedLive:true },
  { id:"txn_007", date:"2026-09-15", amount:85000, currency:"INR", raw_description:"SALARY CREDIT / ACME TECHNOLOGIES", merchant:"Salary", category:"Income", source:"hdfc_savings_csv", is_recurring:true, recurring_group_id:"rec_salary", capturedLive:true },
  { id:"txn_008", date:"2026-09-18", amount:-159, currency:"INR", raw_description:"UPI/HOTSTAR/77821/AUTOPAY", merchant:"Hotstar", category:"Entertainment", source:"email_receipt", is_recurring:true, recurring_group_id:"rec_hotstar", capturedLive:false },
  { id:"txn_009", date:"2026-09-20", amount:-799, currency:"INR", raw_description:"UPI/URBANSPORTS/2388", merchant:"Urban Sports", category:"Fitness", source:"live_log", is_recurring:false, recurring_group_id:null, capturedLive:true },
  { id:"txn_010", date:"2026-09-22", amount:-430, currency:"INR", raw_description:"UPI/SWIGGY/92821", merchant:"Swiggy", category:"Food", source:"live_log", is_recurring:false, recurring_group_id:null, capturedLive:true }
];

const seedSubscriptions = [
  { id:"sub_1", merchant:"Netflix", monthly:649, nextCharge:"2026-10-03", annual:7788, priceHike:false, forgotten:false, status:"keep", category:"Entertainment" },
  { id:"sub_2", merchant:"Spotify", monthly:299, nextCharge:"2026-10-05", annual:3588, priceHike:false, forgotten:false, status:"keep", category:"Entertainment" },
  { id:"sub_3", merchant:"Swiggy One", monthly:299, nextCharge:"2026-10-07", annual:3588, priceHike:true, forgotten:false, status:"keep", category:"Food" },
  { id:"sub_4", merchant:"Hotstar", monthly:159, nextCharge:"2026-10-18", annual:1908, priceHike:true, forgotten:true, status:"review", category:"Entertainment" },
  { id:"sub_5", merchant:"Urban Gym", monthly:1499, nextCharge:"2026-10-02", annual:17988, priceHike:false, forgotten:false, status:"keep", category:"Fitness" }
];

const seedCommitments = [
  { id:"c1", date:"2026-10-01", merchant:"Rent", amount:-12000, type:"Housing", icon:"home" },
  { id:"c2", date:"2026-10-02", merchant:"Urban Gym", amount:-1499, type:"Subscription", icon:"zap" },
  { id:"c3", date:"2026-10-03", merchant:"Netflix", amount:-649, type:"Subscription", icon:"play" },
  { id:"c4", date:"2026-10-05", merchant:"Spotify", amount:-299, type:"Subscription", icon:"music" },
  { id:"c5", date:"2026-10-07", merchant:"Swiggy One", amount:-299, type:"Subscription", icon:"food" },
  { id:"c6", date:"2026-10-10", merchant:"Phone EMI", amount:-2450, type:"EMI", icon:"credit" },
  { id:"c7", date:"2026-10-12", merchant:"Mirae Asset SIP", amount:-5000, type:"Investment", icon:"chart" },
  { id:"c8", date:"2026-10-18", merchant:"Hotstar", amount:-159, type:"Subscription", icon:"play" }
];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function App() {
  const [page, setPage] = useState("home");
  const [transactions, setTransactions] = useState(() => load("cw_transactions", seedTransactions));
  const [subscriptions, setSubscriptions] = useState(() => load("cw_subscriptions", seedSubscriptions));
  const [commitments, setCommitments] = useState(() => load("cw_commitments", seedCommitments));
  const [livePayments, setLivePayments] = useState(() => load("cw_live", []));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => localStorage.setItem("cw_transactions", JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem("cw_subscriptions", JSON.stringify(subscriptions)), [subscriptions]);
  useEffect(() => localStorage.setItem("cw_commitments", JSON.stringify(commitments)), [commitments]);
  useEffect(() => localStorage.setItem("cw_live", JSON.stringify(livePayments)), [livePayments]);

  const currentMonth = "2026-09";
  const spent = transactions.filter(t => t.date.startsWith(currentMonth) && t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
  const income = transactions.filter(t => t.date.startsWith(currentMonth) && t.amount > 0).reduce((s,t) => s + t.amount, 0);
  const committed30 = commitments.reduce((s,c) => s + Math.abs(c.amount), 0);
  const freeToSpend = Math.max(0, income - spent - committed30);

  function addLivePayment(payment) {
    const item = {
      id: "live_" + Date.now(),
      merchant: payment.merchant || "Unknown merchant",
      amount: Number(payment.amount) || 0,
      category: payment.category || "Uncategorised",
      note: payment.note || "",
      location: payment.location || "Location attached",
      timestamp: new Date().toISOString()
    };
    setLivePayments(v => [item, ...v]);
  }

  function importCsv(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const mapped = data.map((r, i) => {
          const keys = Object.keys(r);
          const pick = (...names) => {
            const key = keys.find(k => names.includes(k.toLowerCase().trim()));
            return key ? r[key] : "";
          };
          const rawAmount = String(pick("amount","transaction amount","debit","credit")).replace(/[₹,\s]/g,"");
          let amount = Number(rawAmount) || 0;
          const type = String(pick("type","transaction type","dr/cr")).toLowerCase();
          if (type.includes("debit") || type === "dr") amount = -Math.abs(amount);
          const raw = pick("description","narration","details","merchant","remarks") || "Imported transaction";
          return {
            id: `csv_${Date.now()}_${i}`,
            date: normalizeDate(pick("date","transaction date","value date")) || "2026-09-01",
            amount,
            currency: "INR",
            raw_description: raw,
            merchant: normalizeMerchant(raw),
            category: guessCategory(raw),
            source: file.name,
            is_recurring: /autopay|nach|ecs|standing|sip|emi/i.test(raw),
            recurring_group_id: null,
            capturedLive: false
          };
        });
        setTransactions(old => [...mapped, ...old]);
        alert(`${mapped.length} transaction(s) imported and normalised.`);
        setPage("statements");
      },
      error: () => alert("Could not read that CSV.")
    });
  }

  const nav = [
    ["home","Home",Home],
    ["live","Live Log",Zap],
    ["commitments","Commitments",CalendarClock],
    ["subscriptions","Subscriptions",Receipt],
    ["statements","Statements",FileText]
  ];

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19}/></div>
          <div><strong>CommitWise</strong><span>spend with clarity</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X/></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([id,label,Icon]) => (
            <button key={id} className={page===id ? "active" : ""} onClick={() => {setPage(id);setSidebarOpen(false)}}>
              <Icon size={18}/><span>{label}</span>{id==="live" && livePayments.length>0 && <b className="nav-badge">{livePayments.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-card">
            <ShieldCheck size={18}/>
            <div><strong>Your data stays local</strong><span>No bank login. Demo data lives in this browser.</span></div>
          </div>
          <button className="settings"><Settings size={17}/> Settings</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu/></button>
          <div className="crumb">Workspace <ChevronRight size={15}/> <strong>{nav.find(x=>x[0]===page)?.[1]}</strong></div>
          <div className="top-actions">
            <div className="avatar">NG</div>
          </div>
        </header>

        <div className="content">
          {page === "home" && <HomePage freeToSpend={freeToSpend} spent={spent} committed={committed30} income={income} subscriptions={subscriptions} commitments={commitments} onNavigate={setPage}/>}
          {page === "live" && <LivePage livePayments={livePayments} addLivePayment={addLivePayment}/>}
          {page === "commitments" && <CommitmentsPage commitments={commitments} subscriptions={subscriptions} />}
          {page === "subscriptions" && <SubscriptionsPage subscriptions={subscriptions} setSubscriptions={setSubscriptions}/>}
          {page === "statements" && <StatementsPage transactions={transactions} onImport={importCsv} setTransactions={setTransactions}/>}
        </div>
      </main>
    </div>
  );
}

function PageHeader({eyebrow, title, description, action}) {
  return <div className="page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>;
}

function HomePage({freeToSpend,spent,committed,income,subscriptions,commitments,onNavigate}) {
  const subMonthly = subscriptions.reduce((s,x)=>s+x.monthly,0);
  return <div>
    <PageHeader eyebrow="Sunday, 27 September" title="Know what’s already committed." description="Your money, before the month gets away from you." />
    <section className="hero-grid">
      <div className="spend-card">
        <div className="card-top"><span>FREE TO SPEND</span><span className="status-dot"><i/> On track</span></div>
        <div className="hero-number">{money(freeToSpend)}</div>
        <div className="hero-sub">Available after spending and known commitments</div>
        <div className="progress"><span style={{width:`${Math.min(100,(spent+committed)/(income||1)*100)}%`}}/></div>
        <div className="progress-labels"><span>{money(spent)} spent</span><span>{money(committed)} committed</span></div>
      </div>
      <div className="mini-stat"><div className="stat-icon green"><ArrowDownToLine/></div><span>Income this month</span><strong>{money(income)}</strong><small>Salary + credits</small></div>
      <div className="mini-stat"><div className="stat-icon orange"><CreditCard/></div><span>Committed next 30d</span><strong>{money(committed)}</strong><small>{commitments.length} known outflows</small></div>
      <div className="mini-stat"><div className="stat-icon purple"><Receipt/></div><span>Recurring monthly</span><strong>{money(subMonthly)}</strong><small>{subscriptions.length} recurring charges</small></div>
    </section>

    <div className="section-heading"><div><h2>Upcoming commitments</h2><p>The payments already waiting for your money.</p></div><button className="text-button" onClick={()=>onNavigate("commitments")}>View all <ChevronRight size={16}/></button></div>
    <div className="commitment-grid">
      {commitments.slice(0,4).map(c=><CommitmentCard key={c.id} item={c}/>)}
    </div>

    <div className="home-lower">
      <div className="panel">
        <div className="panel-heading"><div><h3>Subscription pulse</h3><p>Recurring charges worth checking.</p></div><button className="icon-button"><ArrowUpRight/></button></div>
        {subscriptions.slice(0,4).map(s=><SubscriptionRow key={s.id} item={s}/>)}
      </div>
      <div className="insight-card">
        <div className="spark"><Sparkles size={18}/></div>
        <div className="eyebrow">COMMITWISE INSIGHT</div>
        <h3>You have {money(subMonthly)} of recurring charges every month.</h3>
        <p>One subscription is marked forgotten and two have price-change signals. Review them before your next billing cycle.</p>
        <button onClick={()=>onNavigate("subscriptions")}>Review subscriptions <ChevronRight size={16}/></button>
      </div>
    </div>
  </div>;
}

function CommitmentCard({item}) {
  const date = new Date(item.date+"T12:00:00");
  return <div className="commitment-card">
    <div className="date-block"><strong>{date.getDate()}</strong><span>{date.toLocaleString("en",{month:"short"}).toUpperCase()}</span></div>
    <div className="commitment-info"><strong>{item.merchant}</strong><span>{item.type}</span></div>
    <strong className="amount">{money(item.amount)}</strong>
  </div>;
}

function SubscriptionRow({item, compact=false}) {
  return <div className="sub-row">
    <div className="merchant-logo">{item.merchant.slice(0,1)}</div>
    <div className="sub-main"><strong>{item.merchant}</strong><span>{money(item.monthly)}/month · next {formatDate(item.nextCharge)}</span></div>
    {!compact && <div className="flag-area">{item.forgotten && <span className="pill red">Forgotten?</span>}{item.priceHike && <span className="pill amber">Price change</span>}</div>}
    <strong className="sub-cost">{money(item.monthly)}</strong>
  </div>;
}

function LivePage({livePayments,addLivePayment}) {
  const [form,setForm]=useState({merchant:"",amount:"",category:"",note:"",location:"Bengaluru, Karnataka"});
  const submit=e=>{e.preventDefault();if(!form.amount)return;addLivePayment(form);setForm({merchant:"",amount:"",category:"",note:"",location:"Bengaluru, Karnataka"});};
  return <div>
    <PageHeader eyebrow="LIVE LOG" title="Capture what just happened." description="Paste or share a payment now. Add context while you still remember it." />
    <div className="live-grid">
      <div className="panel capture-panel">
        <div className="capture-title"><div className="capture-icon"><Zap/></div><div><h3>What did you just pay?</h3><p>Keep it lightweight. The app attaches time and location.</p></div></div>
        <form onSubmit={submit}>
          <div className="field-row"><label>Merchant<input placeholder="e.g. Swiggy" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})}/></label><label>Amount<input type="number" placeholder="₹ 0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label></div>
          <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Choose one</option><option>Food</option><option>Transport</option><option>Shopping</option><option>Entertainment</option><option>Utilities</option><option>Other</option></select></label>
          <label>What was this?<input placeholder="Optional note, e.g. dinner with team" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
          <div className="location-chip"><span>⌖</span>{form.location}<small>attached</small></div>
          <button className="primary full" type="submit"><Plus size={17}/> Add payment</button>
        </form>
      </div>
      <div className="panel">
        <div className="panel-heading"><div><h3>Today’s captured payments</h3><p>{livePayments.length} added in this browser</p></div><span className="live-indicator"><i/> LIVE</span></div>
        {livePayments.length===0 ? <Empty icon={<Zap/>} title="Nothing captured yet" text="Add a payment on the left to see it appear here."/> :
          <div className="live-list">{livePayments.map(x=><div className="live-item" key={x.id}><div className="live-time">{new Date(x.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div className="merchant-logo">{x.merchant.slice(0,1).toUpperCase()}</div><div className="sub-main"><strong>{x.merchant}</strong><span>{x.category}{x.note ? ` · ${x.note}`:""}</span></div><strong>{money(-Math.abs(x.amount))}</strong></div>)}</div>}
      </div>
    </div>
  </div>;
}

function CommitmentsPage({commitments}) {
  const groups = useMemo(()=>groupByDate(commitments),[commitments]);
  return <div>
    <PageHeader eyebrow="NEXT 30 DAYS" title="Your money already has plans." description="Fixed and recurring outflows on one timeline, so free-to-spend stays honest." action={<button className="primary"><Plus size={17}/> Add commitment</button>}/>
    <div className="commitment-summary"><div><span>Total committed</span><strong>{money(commitments.reduce((s,c)=>s+Math.abs(c.amount),0))}</strong></div><div><span>Known payments</span><strong>{commitments.length}</strong></div><div><span>Largest</span><strong>{money(Math.max(...commitments.map(c=>Math.abs(c.amount))))}</strong></div></div>
    <div className="timeline">
      {Object.entries(groups).map(([date,items])=><div className="timeline-row" key={date}><div className="timeline-date"><strong>{new Date(date+"T12:00:00").getDate()}</strong><span>{new Date(date+"T12:00:00").toLocaleString("en",{month:"short"}).toUpperCase()}</span></div><div className="timeline-line"><i/></div><div className="timeline-content">{items.map(item=><div className="timeline-card" key={item.id}><div className="type-icon"><CalendarClock size={17}/></div><div className="sub-main"><strong>{item.merchant}</strong><span>{item.type} · recurring commitment</span></div><strong>{money(item.amount)}</strong></div>)}</div></div>)}
    </div>
  </div>;
}

function SubscriptionsPage({subscriptions,setSubscriptions}) {
  const [query,setQuery]=useState("");
  const filtered=subscriptions.filter(s=>s.merchant.toLowerCase().includes(query.toLowerCase()));
  const toggle=id=>setSubscriptions(xs=>xs.map(x=>x.id===id?{...x,status:x.status==="keep"?"review":"keep"}:x));
  const total=subscriptions.reduce((s,x)=>s+x.monthly,0);
  return <div>
    <PageHeader eyebrow="RECURRING SPEND" title="Subscriptions you can actually see." description="Monthly cost, next charge and signals that deserve your attention." action={<button className="primary"><Plus size={17}/> Add subscription</button>}/>
    <div className="sub-hero"><div><span>RECURRING EVERY MONTH</span><strong>{money(total)}</strong><p>{money(total*12)} projected annual cost</p></div><div className="sub-hero-stats"><span><b>{subscriptions.filter(x=>x.forgotten).length}</b> forgotten</span><span><b>{subscriptions.filter(x=>x.priceHike).length}</b> price changes</span><span><b>{subscriptions.length}</b> detected</span></div></div>
    <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search subscriptions" value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="filter">All <ChevronRight size={15}/></button></div>
    <div className="panel sub-table">
      <div className="table-head"><span>MERCHANT</span><span>MONTHLY</span><span>ANNUAL</span><span>NEXT CHARGE</span><span>FLAGS</span><span>ACTION</span></div>
      {filtered.map(s=><div className="table-row" key={s.id}><div className="merchant-cell"><div className="merchant-logo">{s.merchant.slice(0,1)}</div><div><strong>{s.merchant}</strong><small>{s.category}</small></div></div><strong>{money(s.monthly)}</strong><span>{money(s.annual)}</span><span>{formatDate(s.nextCharge)}</span><div className="flag-area">{s.forgotten&&<span className="pill red">Forgotten</span>}{s.priceHike&&<span className="pill amber">Price hike</span>}</div><button className={s.status==="keep"?"outline-button":"primary small"} onClick={()=>toggle(s.id)}>{s.status==="keep"?"Keep":"Review"}</button></div>)}
    </div>
  </div>;
}

function StatementsPage({transactions,onImport,setTransactions}) {
  const [drag,setDrag]=useState(false);
  const [search,setSearch]=useState("");
  const fileInput=React.useRef();
  const filtered=transactions.filter(t=>(t.merchant+" "+t.raw_description).toLowerCase().includes(search.toLowerCase()));
  const uncaptured=transactions.filter(t=>t.amount<0&&!t.capturedLive&&t.date.startsWith("2026-09"));
  return <div>
    <PageHeader eyebrow="STATEMENTS" title="Reconcile the messy stuff." description="Upload a CSV, normalise transactions into the common schema, then spot payments that never made it into the live log."/>
    <div className={`dropzone ${drag?"drag":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)onImport(f)}} onClick={()=>fileInput.current?.click()}>
      <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={e=>e.target.files?.[0]&&onImport(e.target.files[0])}/>
      <div className="upload-icon"><Upload/></div><h3>Drop a CSV statement here</h3><p>or click to browse · HDFC / ICICI / SBI-style exports supported</p><button className="outline-button" type="button">Choose CSV</button>
    </div>
    <div className="reconcile-grid"><div className="panel"><div className="panel-heading"><div><h3>Reconciliation health</h3><p>How much of your statement is accounted for?</p></div><ShieldCheck size={20}/></div><div className="health-number">{Math.round(((transactions.filter(t=>t.capturedLive).length)/(transactions.length||1))*100)}<small>% captured live</small></div><div className="health-bars"><div><span>Normalised</span><b style={{width:"94%"}}/></div><div><span>Merchant matched</span><b style={{width:"91%"}}/></div><div><span>Recurring detected</span><b style={{width:"88%"}}/></div></div></div>
      <div className="panel flagged"><div className="panel-heading"><div><h3>Never captured live</h3><p>Potential missed context</p></div><span className="pill red">{uncaptured.length} flagged</span></div>{uncaptured.slice(0,4).map(t=><div className="flagged-row" key={t.id}><div><strong>{t.merchant}</strong><span>{formatDate(t.date)} · {t.category}</span></div><strong>{money(t.amount)}</strong></div>)}</div></div>
    <div className="section-heading"><div><h2>Normalised transactions</h2><p>{transactions.length} records in the common schema.</p></div><div className="search compact"><Search size={16}/><input placeholder="Search merchant..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <div className="panel transactions-table"><div className="table-head tx"><span>DATE</span><span>MERCHANT / RAW</span><span>CATEGORY</span><span>AMOUNT</span><span>RECURRING</span><span>SOURCE</span></div>{filtered.slice(0,30).map(t=><div className="table-row tx" key={t.id}><span>{formatDate(t.date)}</span><div><strong>{t.merchant}</strong><small>{t.raw_description}</small></div><span className="category-tag">{t.category}</span><strong className={t.amount<0?"debit":"credit"}>{money(t.amount)}</strong><span>{t.is_recurring?<span className="recurring"><Check size={13}/> Yes</span>:"—"}</span><small>{t.source}</small></div>)}</div>
  </div>;
}

function Empty({icon,title,text}) {
  return <div className="empty"><div>{icon}</div><strong>{title}</strong><span>{text}</span></div>;
}

function formatDate(s) {
  const d = new Date(s+"T12:00:00");
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function normalizeDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0,10);
}
function normalizeMerchant(raw) {
  const s=String(raw).toUpperCase();
  if (/NETFLIX/.test(s)) return "Netflix";
  if (/SPOTIFY/.test(s)) return "Spotify";
  if (/HOTSTAR|DISNEY/.test(s)) return "Hotstar";
  if (/SWIGGY/.test(s)) return /ONE/.test(s) ? "Swiggy One" : "Swiggy";
  if (/BAJAJ|PHONE.*EMI|EMI/.test(s)) return "Phone EMI";
  if (/MIRAE|SIP/.test(s)) return "Mirae Asset SIP";
  if (/RENT/.test(s)) return "Rent";
  if (/SALARY/.test(s)) return "Salary";
  return String(raw).split("/")[0].replace(/[-_]/g," ").trim().slice(0,40) || "Unknown merchant";
}
function guessCategory(raw) {
  const s=String(raw).toLowerCase();
  if (/netflix|spotify|hotstar|prime/.test(s)) return "Entertainment";
  if (/swiggy|zomato|restaurant|food/.test(s)) return "Food";
  if (/emi|bajaj/.test(s)) return "EMI";
  if (/sip|mutual|investment/.test(s)) return "Investments";
  if (/rent|housing/.test(s)) return "Housing";
  if (/salary|payroll/.test(s)) return "Income";
  return "Other";
}
function groupByDate(items) {
  return items.reduce((a,x)=>{(a[x.date]??=[]).push(x);return a},{});
}

createRoot(document.getElementById("root")).render(<App />);
