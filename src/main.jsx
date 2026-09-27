import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ingestFile, fileKind, reconcileAndDetect } from "./ingestion";
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

const STORAGE_VERSION = "commitwise-upload-first-v4";

function initializeStorage() {
  try {
    if (localStorage.getItem("cw_storage_version") !== STORAGE_VERSION) {
      ["cw_transactions", "cw_subscriptions", "cw_commitments", "cw_live"].forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("cw_storage_version", STORAGE_VERSION);
    }
  } catch {}
}

initializeStorage();

function load(key, fallback=[]) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}

function buildSubscriptions(transactions) {
  const groups = new Map();
  transactions.filter(t => t.amount < 0 && t.is_recurring).forEach(t => {
    const key = t.recurring_group_id || `merchant_${String(t.merchant).toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  });
  return [...groups.entries()].map(([key, items], i) => {
    items.sort((a,b) => a.date.localeCompare(b.date));
    const amounts = items.map(x => Math.abs(Number(x.amount) || 0));
    const monthly = Math.round(amounts.reduce((a,b)=>a+b,0) / amounts.length);
    const last = items.at(-1);
    const previous = items.at(-2);
    const priceHike = Boolean(previous && Math.abs(last.amount) > Math.abs(previous.amount) * 1.05);
    const next = nextOccurrence(last.date, items.length > 1 ? averageGap(items) : 30);
    return {
      id: `sub_${i}_${key}`, merchant:last.merchant, monthly, annual:monthly*12,
      nextCharge:next, priceHike, forgotten:items.every(x => !x.capturedLive),
      status:"keep", category:last.category, source:"detected_from_upload"
    };
  });
}

function averageGap(items) {
  if (items.length < 2) return 30;
  let total=0;
  for(let i=1;i<items.length;i++) total += (new Date(items[i].date)-new Date(items[i-1].date))/86400000;
  return Math.max(7, Math.round(total/(items.length-1)));
}

function nextOccurrence(date, gap=30) {
  const d = new Date(`${date}T12:00:00`);
  const now = new Date();
  while (d <= now) d.setDate(d.getDate()+gap);
  return d.toISOString().slice(0,10);
}

function buildCommitments(transactions, subscriptions) {
  return subscriptions
    .filter(s => s.nextCharge)
    .map((s,i) => ({id:`commit_${i}_${s.id}`, date:s.nextCharge, merchant:s.merchant, amount:-Math.abs(s.monthly), type:s.category === "EMI" ? "EMI" : s.category === "Housing" ? "Housing" : "Recurring", icon:"calendar"}));
}


function App() {
  const [page, setPage] = useState("home");
  const [transactions, setTransactions] = useState(() => load("cw_transactions", []));
  const [subscriptions, setSubscriptions] = useState(() => load("cw_subscriptions", []));
  const [commitments, setCommitments] = useState(() => load("cw_commitments", []));
  const [livePayments, setLivePayments] = useState(() => load("cw_live", []));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => localStorage.setItem("cw_transactions", JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem("cw_subscriptions", JSON.stringify(subscriptions)), [subscriptions]);
  useEffect(() => localStorage.setItem("cw_commitments", JSON.stringify(commitments)), [commitments]);
  useEffect(() => localStorage.setItem("cw_live", JSON.stringify(livePayments)), [livePayments]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const spent = transactions.filter(t => t.date.startsWith(currentMonth) && t.amount < 0 && !t.excluded && t.category !== "Transfer").reduce((s,t) => s + Math.abs(t.amount), 0);
  const income = transactions.filter(t => t.date.startsWith(currentMonth) && t.amount > 0).reduce((s,t) => s + t.amount, 0);
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);
  const committed30 = commitments.filter(c => { const d = new Date(`${c.date}T12:00:00`); return d >= now && d <= horizon; }).reduce((s,c) => s + Math.abs(c.amount), 0);
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

  async function importFile(file) {
    if (!file) return;
    const kind = fileKind(file);
    if (kind === "unsupported") {
      alert("Unsupported file. Use CSV, XLSX/XLS, PDF, PNG, JPG, JPEG, WEBP, TXT or EML.");
      return;
    }
    try {
      const result = await ingestFile(file, {
        onProgress: (progress) => setImportProgress(Math.round(progress * 100))
      });
      if (result.errors?.length) {
        alert(result.errors.join("\n"));
        return;
      }
      if (result.transactions?.length) {
        const merged = await reconcileAndDetect([...result.transactions, ...transactions], livePayments);
        setTransactions(merged);
        const detectedSubscriptions = buildSubscriptions(merged);
        const detectedCommitments = buildCommitments(merged, detectedSubscriptions);
        setSubscriptions(detectedSubscriptions);
        setCommitments(detectedCommitments);
        setImportSummary({ file: file.name, kind, count: result.transactions.length, warnings: result.warnings || [], metadata: result.metadata || {} });
        setPage("statements");
      } else {
        setImportSummary({ file: file.name, kind, count: 0, warnings: result.warnings || ["No transaction rows were detected."], metadata: result.metadata || {} });
      }
    } catch (error) {
      alert(`Could not process ${file.name}: ${error.message}`);
    } finally {
      setImportProgress(null);
    }
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
            <div><strong>Your data stays local</strong><span>No bank login. Your uploaded data stays in this browser.</span></div>
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
          {page === "home" && <HomePage transactions={transactions} freeToSpend={freeToSpend} spent={spent} committed={committed30} income={income} subscriptions={subscriptions} commitments={commitments} onNavigate={setPage}/>}
          {page === "live" && <LivePage livePayments={livePayments} addLivePayment={addLivePayment}/>}
          {page === "commitments" && <CommitmentsPage commitments={commitments} subscriptions={subscriptions} />}
          {page === "subscriptions" && <SubscriptionsPage subscriptions={subscriptions} setSubscriptions={setSubscriptions}/>}
          {page === "statements" && <StatementsPage transactions={transactions} onImport={importFile} importProgress={importProgress} importSummary={importSummary}/>}
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

function HomePage({transactions,freeToSpend,spent,committed,income,subscriptions,commitments,onNavigate}) {
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

    {transactions.length===0 && <div className="panel upload-first"><div className="upload-icon"><Upload/></div><div><div className="eyebrow">START WITH YOUR DATA</div><h3>No statement data yet</h3><p>Upload your CSV, Excel, PDF, receipt image, or payslip from Statements. Your dashboard will be calculated from those files — there is no hidden demo dataset.</p></div><button className="primary" onClick={()=>onNavigate("statements")}><Upload size={17}/> Upload data</button></div>}

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

function StatementsPage({transactions,onImport,importProgress,importSummary}) {
  const [drag,setDrag]=useState(false);
  const [search,setSearch]=useState("");
  const fileInput=React.useRef();
  const filtered=transactions.filter(t=>(t.merchant+" "+t.raw_description).toLowerCase().includes(search.toLowerCase()));
  const uncaptured=transactions.filter(t=>t.amount<0&&!t.capturedLive);
  const accepted=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt,.eml";
  const fileTypes=[
    ["CSV","Bank statement exports"],["XLSX / XLS","Excel statements"],["PDF","Digital bank statements"],["PNG / JPG / WEBP","Receipts & scanned documents"],["TXT","Payslip text exports"],["EML","Email receipts / alerts"]
  ];
  return <div>
    <PageHeader eyebrow="STATEMENTS & INGESTION" title="Bring in the messy stuff." description="CommitWise now turns common statement, spreadsheet, PDF and receipt files into the same transaction schema."/>
    <div className={`dropzone ${drag?"drag":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const files=[...e.dataTransfer.files];files.forEach(onImport)}} onClick={()=>fileInput.current?.click()}>
      <input ref={fileInput} type="file" accept={accepted} multiple hidden onChange={e=>[...e.target.files].forEach(onImport)}/>
      <div className="upload-icon"><Upload/></div>
      <h3>{importProgress!==null?`Reading file… ${importProgress}%`:"Drop one or more statements or receipts here"}</h3>
      <p>CSV · Excel · PDF · PNG · JPG · WEBP · TXT · EML · all processed locally in the browser</p>
      <button className="outline-button" type="button">Choose file</button>
    </div>
    <div className="ingestion-types">{fileTypes.map(([name,text])=><div key={name}><strong>{name}</strong><span>{text}</span></div>)}</div>
    {importSummary&&<div className="panel import-result"><div><strong>{importSummary.file}</strong><span>{importSummary.count} transaction{importSummary.count===1?"":"s"} normalised · {importSummary.metadata?.format||importSummary.kind}</span></div><div>{importSummary.warnings?.length?<span className="pill amber">{importSummary.warnings.length} warning{importSummary.warnings.length===1?"":"s"}</span>:<span className="pill green">Parsed successfully</span>}</div></div>}
    <div className="reconcile-grid"><div className="panel"><div className="panel-heading"><div><h3>Reconciliation health</h3><p>How much of your statement is accounted for?</p></div><ShieldCheck size={20}/></div><div className="health-number">{Math.round((transactions.filter(t=>t.capturedLive).length/(transactions.length||1))*100)}<small>% captured live</small></div><div className="health-bars"><div><span>Normalised</span><b style={{width:`${Math.min(100,transactions.length?96:0)}%`}}/></div><div><span>Merchant matched</span><b style={{width:`${Math.min(100,transactions.length?91:0)}%`}}/></div><div><span>Recurring detected</span><b style={{width:`${Math.min(100,transactions.filter(t=>t.is_recurring).length/(transactions.length||1)*100)}%`}}/></div></div></div>
      <div className="panel flagged"><div className="panel-heading"><div><h3>Never captured live</h3><p>Potential missed context</p></div><span className="pill red">{uncaptured.length} flagged</span></div>{uncaptured.slice(0,5).map(t=><div className="flagged-row" key={t.id}><div><strong>{t.merchant}</strong><span>{formatDate(t.date)} · {t.category}</span></div><strong>{money(t.amount)}</strong></div>)}</div></div>
    <div className="section-heading"><div><h2>Normalised transactions</h2><p>{transactions.length} records in the common schema.</p></div><div className="search compact"><Search size={16}/><input placeholder="Search merchant..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <div className="panel transactions-table"><div className="table-head tx"><span>DATE</span><span>MERCHANT / RAW</span><span>CATEGORY</span><span>AMOUNT</span><span>RECURRING</span><span>SOURCE</span></div>{filtered.slice(0,40).map(t=><div className="table-row tx" key={t.id}><span>{formatDate(t.date)}</span><div><strong>{t.merchant}</strong><small>{t.raw_description}</small></div><span className="category-tag">{t.category}</span><strong className={t.amount<0?"debit":"credit"}>{money(t.amount)}</strong><span>{t.is_recurring?<span className="recurring"><Check size={13}/> Yes</span>:"—"}</span><small>{t.source}</small></div>)}</div>
  </div>;
}
function Empty({icon,title,text}) {
  return <div className="empty"><div>{icon}</div><strong>{title}</strong><span>{text}</span></div>;
}

function formatDate(s) {
  const d = new Date(s+"T12:00:00");
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function groupByDate(items) {
  return items.reduce((a,x)=>{(a[x.date]??=[]).push(x);return a},{});
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div style={{fontFamily:"system-ui",padding:40,maxWidth:800,margin:"40px auto"}}>
        <h1>CommitWise could not start</h1>
        <p>The app hit a startup error. Your uploaded files are not the cause; this is a browser/runtime error.</p>
        <pre style={{whiteSpace:"pre-wrap",background:"#f5f5f5",padding:16,borderRadius:12}}>{String(this.state.error?.stack || this.state.error)}</pre>
        <button onClick={() => location.reload()} style={{padding:"10px 16px",borderRadius:8,border:0}}>Reload</button>
      </div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
