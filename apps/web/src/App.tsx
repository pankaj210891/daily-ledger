import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  clearSessionMarker,
  AttendanceRecord,
  Entry,
  EntryInput,
  getToken,
  hadSession,
  Product,
  MonthlyBill,
  SalaryCalculation,
  ScheduledDelivery,
  StaffMember,
  SessionExpiredError,
  setToken,
} from "./api";
import {
  dateLabel,
  householdDateKey,
  householdMonthKey,
  monthLabel,
  monthTitle,
  money,
} from "./lib/formatters";
import { LoadingState } from "./components/feedback/LoadingState";
import { StatusBadge } from "./components/ui/StatusBadge";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { MobileMonthPicker } from "./components/MobileMonthPicker";
import { MobileExpensesWorkspace } from "./features/expenses/MobileExpensesWorkspace";
import { ProductsWorkspace } from "./features/products/ProductsWorkspace";
import { DeliveriesWorkspace } from "./features/deliveries/DeliveriesWorkspace";
import { MonthlyBillsWorkspace } from "./features/bills/MonthlyBillsWorkspace";
import { SalaryWorkspace, StaffWorkspace } from "./features/staff/StaffWorkspace";

type Section =
  | "Overview"
  | "Deliveries"
  | "Products & Rates"
  | "Monthly Bills"
  | "Staff & Attendance"
  | "Salary Management"
  | "Household Expenses"
  | "Reports"
  | "Settings"
  | "More";
const sectionSlugs: Record<Section, string> = {
  Overview: "overview",
  Deliveries: "deliveries",
  "Products & Rates": "products-rates",
  "Staff & Attendance": "staff-attendance",
  "Monthly Bills": "monthly-bills",
  "Salary Management": "salary-management",
  "Household Expenses": "household-expenses",
  Reports: "reports",
  Settings: "settings",
  More: "more",
};
function sectionFromPath(pathname: string): Section {
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return (
    (Object.entries(sectionSlugs).find(([, value]) => value === slug)?.[0] as
      | Section
      | undefined) || "Overview"
  );
}
function sectionPath(section: Section) {
  return `/${sectionSlugs[section]}`;
}
const groups: {
  title: string;
  items: { name: Section; icon: string; type?: string }[];
}[] = [
  { title: "WORKSPACE", items: [{ name: "Overview", icon: "▦" }] },
  {
    title: "DAILY OPERATIONS",
    items: [
      { name: "Deliveries", icon: "◷", type: "delivery" },
      { name: "Products & Rates", icon: "▤", type: "product" },
      { name: "Staff & Attendance", icon: "♙", type: "staff" },
    ],
  },
  {
    title: "FINANCES",
    items: [
      { name: "Monthly Bills", icon: "▧", type: "bill" },
      { name: "Salary Management", icon: "₹", type: "salary" },
      { name: "Household Expenses", icon: "↗", type: "expense" },
      { name: "Reports", icon: "▥" },
    ],
  },
  { title: "PREFERENCES", items: [{ name: "Settings", icon: "⚙" }] },
];
const mobileHeadings: Record<Section, { eyebrow: string; title: string; subtitle: string }> = {
  Overview: { eyebrow: "DAILY LEDGER", title: "Overview", subtitle: "Your household at a glance." },
  Deliveries: { eyebrow: "DAILY OPERATIONS", title: "Deliveries", subtitle: "Track scheduled, partial, and completed deliveries." },
  "Products & Rates": { eyebrow: "DAILY OPERATIONS", title: "Products & rates", subtitle: "Manage household products, delivery schedules, and rate history." },
  "Monthly Bills": { eyebrow: "FINANCES", title: "Monthly bills", subtitle: "Product charges use the rate effective on each scheduled date." },
  "Staff & Attendance": { eyebrow: "DAILY OPERATIONS", title: "Staff & attendance", subtitle: "Manage staff profiles, attendance, household holidays, and salary inputs." },
  "Salary Management": { eyebrow: "FINANCES", title: "Salary management", subtitle: "Live estimates based on attendance, leave, holidays, and staff dates." },
  "Household Expenses": { eyebrow: "FINANCES", title: "Household expenses", subtitle: "One-time manual expenses for your household." },
  Reports: { eyebrow: "FINANCES", title: "Reports", subtitle: "Manual ledger activity and outflow for the selected month." },
  Settings: { eyebrow: "PREFERENCES", title: "Settings", subtitle: "Account and household information." },
  More: { eyebrow: "DAILY LEDGER", title: "More", subtitle: "Additional household tools and your account." },
};
const typeFor: Partial<Record<Section, string>> = {
  Deliveries: "delivery",
  "Products & Rates": "product",
  "Monthly Bills": "bill",
  "Staff & Attendance": "staff",
  "Salary Management": "salary",
  "Household Expenses": "expense",
};
const typesFor: Partial<Record<Section, string[]>> = {
  "Staff & Attendance": ["staff", "attendance"],
};
function MobileTabIcon({ name, active = false }: { name: "home" | "deliveries" | "bills" | "staff" | "more"; active?: boolean }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false" className="mobile-tab-icon" {...common}>
      {name === "home" && (active ? <><path d="m12 3 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z" fill="currentColor" stroke="none"/><path d="M9 21v-7h6v7" stroke="white"/></> : <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>)}
      {name === "deliveries" && <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v8.5M8 5.2l8 4.6"/></>}
      {name === "bills" && <><path d="M6 3h9l4 4v14H6z" fill={active ? "currentColor" : "none"}/><path d="M14 3v5h5M9 12h7M9 16h7" stroke={active ? "white" : "currentColor"}/></>}
      {name === "staff" && <><circle cx="9" cy="8" r="3" fill={active ? "currentColor" : "none"}/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20z" fill={active ? "currentColor" : "none"}/><path d="M16 5.3a3 3 0 0 1 0 5.4M17 14a5.5 5.5 0 0 1 3.5 5.1V20"/></>}
      {name === "more" && <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>}
    </svg>
  );
}
function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "green",
  onClick,
  className = "",
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{detail}</div>
      {onClick && <span className="stat-card-link">View details →</span>}
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`stat-card stat-card-action ${className}`}
      onClick={onClick}
      aria-label={`${label}: ${value}. ${detail}. View details`}
    >
      {content}
    </button>
  ) : (
    <article className={`stat-card ${className}`}>{content}</article>
  );
}

function SpendingTrend({
  entries,
  selectedMonth,
}: {
  entries: Entry[];
  selectedMonth: string;
}) {
  const months = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1 - 5 + i, 15, 12));
      return { key: householdMonthKey(d), label: monthLabel(d), total: 0 };
    });
  }, [selectedMonth]);
  for (const e of entries) {
    if (
      !["expense", "bill", "salary", "delivery"].includes(e.type) ||
      ["pending", "upcoming"].includes(e.status)
    )
      continue;
    const slot = months.find((m) => m.key === householdMonthKey(e.date));
    if (slot) slot.total += e.amount;
  }
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <section className="panel spending-panel">
      <div className="panel-heading">
        <div>
          <h2>Six-month outflow</h2>
          <p>Through {monthTitle(selectedMonth)}</p>
        </div>
        <span className="chart-legend">
          <span>
            <i className="legend-dot dot-green" /> Ledger entries
          </span>
        </span>
      </div>
      <div className="spending-summary">
        <div>
          <strong>{money(months.at(-1)?.total || 0)}</strong>
          <span className="stat-foot">{monthTitle(selectedMonth)}</span>
        </div>
      </div>
      <div
        className="trend-chart"
        role="img"
        aria-label={`Monthly household spending for the six months ending ${monthTitle(selectedMonth)}`}
      >
        {months.map((m) => (
          <div className="trend-column" key={m.key}>
            <span className="trend-bar-value">
              {m.total ? money(m.total) : "—"}
            </span>
            <div className="trend-track">
              <span
                style={{
                  height: `${m.total ? Math.max(8, (m.total / max) * 100) : 0}%`,
                }}
              />
            </div>
            <span className="trend-month">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryBreakdown({
  entries,
  onView,
  selectedMonth,
}: {
  entries: Entry[];
  onView: (section: Section) => void;
  selectedMonth: string;
}) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (
      !["expense", "bill", "salary", "delivery"].includes(e.type) ||
      ["pending", "upcoming"].includes(e.status) ||
      householdMonthKey(e.date) !== selectedMonth
    )
      continue;
    const key = e.category || "General";
    totals.set(key, (totals.get(key) || 0) + e.amount);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    max = Math.max(1, ...rows.map(([, total]) => total));
  return (
    <section className="panel category-panel">
      <div className="panel-heading">
        <div>
          <h2>Outflow by category</h2>
          <p>{monthTitle(selectedMonth)}</p>
        </div>
        <button
          className="text-link"
          onClick={() => onView("Household Expenses")}
        >
          Expenses →
        </button>
      </div>
      {rows.length ? (
        <div className="category-list">
          {rows.map(([category, total]) => (
            <div className="category-row" key={category}>
              <div className="category-row-head">
                <strong>{category}</strong>
                <span>{money(total)}</span>
              </div>
              <div className="category-track">
                <span
                  style={{ width: `${Math.max(4, (total / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="compact-empty">
          <strong>No recorded outflow.</strong>
          <p>Add an expense to see category totals.</p>
          <button
            className="text-link"
            onClick={() => onView("Household Expenses")}
          >
            Add an expense →
          </button>
        </div>
      )}
    </section>
  );
}

function TodayOperations({
  deliveries,
  attendanceRecords,
  staff,
  onView,
}: {
  deliveries: ScheduledDelivery[];
  attendanceRecords: AttendanceRecord[];
  staff: StaffMember[];
  onView: (section: Section) => void;
}) {
  const today = householdDateKey(new Date());
  const todaysDeliveries = deliveries.filter((item) => item.scheduledDate === today).slice(0, 5);
  const attendance = attendanceRecords.filter((record) => record.date === today && staff.some((member) => member._id === record.staffId && member.isActive));
  const activeStaffToday = staff.filter((member) => member.isActive && member.joinDate <= today && (!member.endDate || member.endDate >= today));
  const present = activeStaffToday.filter((member) => {
    const record = attendance.find((item) => item.staffId === member._id);
    return !record || record.status === "present";
  }).length;
  const absent = attendance.filter((record) => record.status === "absent" || record.status === "lop").length;
  return (
    <section className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Today’s household activity</h2>
          <p>Deliveries and staff attendance · {today}</p>
        </div>
      </div>
      <div className="operations-section">
        <div className="operations-section-title">
          <strong>Deliveries</strong>
          <button className="text-link" onClick={() => onView("Deliveries")}>
            View all →
          </button>
        </div>
        {todaysDeliveries.length ? (
          <div className="operation-list">
            {todaysDeliveries.map((entry) => (
              <div className="operation-row" key={entry._id}>
                <span className="operation-icon">◷</span>
                <span className="operation-name">
                    <strong>{entry.productName}</strong>
                  <small>
                    {entry.deliveredQuantity}/{entry.expectedQuantity} {entry.unit} · {entry.timeSlot}
                  </small>
                </span>
                <span className={`status status-${entry.status}`}>
                  {entry.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="operations-empty">No scheduled deliveries today.</p>
        )}
      </div>
      <div className="operations-section attendance-summary">
        <div className="operations-section-title">
          <strong>Staff attendance</strong>
          <button
            className="text-link"
            onClick={() => onView("Staff & Attendance")}
          >
            View all →
          </button>
        </div>
        {activeStaffToday.length ? (
          <div className="attendance-counts">
            <span>
              <strong>{present}</strong>
              <small>Present</small>
            </span>
            <span>
              <strong>{absent}</strong>
              <small>Absent</small>
            </span>
            <span>
              <strong>{activeStaffToday.length}</strong>
              <small>Active staff</small>
            </span>
          </div>
        ) : (
          <p className="operations-empty">No active staff to summarize.</p>
        )}
      </div>
    </section>
  );
}

function UpcomingPayments({
  entries,
  onPay,
}: {
  entries: Entry[];
  onPay: (entry: Entry) => void;
}) {
  const today = householdDateKey(new Date());
  const upcoming = entries
    .filter((e) => e.type === "bill" || e.type === "salary")
    .filter(
      (e) =>
        e.status !== "paid" &&
        (["pending", "upcoming"].includes(e.status) ||
          Boolean(e.dueDate && householdDateKey(e.dueDate) >= today)),
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate || a.date).getTime() -
        new Date(b.dueDate || b.date).getTime(),
    )
    .slice(0, 4);
  return (
    <section className="panel reminders-panel">
      <div className="panel-heading">
        <div>
          <h2>Manual upcoming payments</h2>
          <p>Bills and salary entries not yet marked paid</p>
        </div>
        <span className="reminder-count">{upcoming.length} due</span>
      </div>
      {upcoming.length ? (
        <div className="upcoming-list">
          {upcoming.map((e) => (
            <div className="upcoming-item" key={e._id}>
              <span className="upcoming-symbol">₹</span>
              <div className="upcoming-copy">
                <strong>{e.name}</strong>
                <small>
                  {e.type === "salary" ? "Salary" : e.category} ·{" "}
                  {dateLabel(e.dueDate || e.date)}
                </small>
              </div>
              <div className="upcoming-total">
                <strong>{money(e.amount)}</strong>
                <button onClick={() => onPay(e)}>Mark paid</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="upcoming-empty">
          <span>✓</span>
          <strong>All clear for now</strong>
          <p>Upcoming bills and salaries will appear here.</p>
        </div>
      )}
    </section>
  );
}

const featureLimitations: Partial<Record<Section, string>> = {
  Deliveries:
    "Delivery records save the selected product name, unit, quantity and date. The API cannot link a delivery to a product record, schedule time slots, or track partial/outstanding, skipped, cancelled or zero-consumption states.",
  "Products & Rates":
    "A product record stores its current rate and unit. Editing replaces that rate; schedules, active/archive state and effective-dated rate history are not available yet.",
  "Monthly Bills":
    "This API does not calculate product-wise bills using scheduled-date rate history. The list below shows saved bill records only.",
  "Staff & Attendance":
    "Basic staff and present/absent records are supported. Leave types, weekly offs, salary policies and effective-dated histories are not available yet.",
  "Salary Management":
    "This API stores manual salary records only. It does not calculate deductions, revisions, advances, partial payments or locked statements.",
  "Household Expenses":
    "One-time expense records are supported. Recurrence, payment allocations and outstanding balance history are not available yet.",
};

function PhaseFourSummary({
  section,
  entries,
}: {
  section: Section;
  entries: Entry[];
}) {
  if (section === "Products & Rates") {
    const products = entries.filter((entry) => entry.type === "product");
    return (
      <section className="stat-grid phase-summary" aria-label="Product summary">
        <StatCard
          label="PRODUCT RECORDS"
          value={String(products.length)}
          detail="Current products and rates"
          icon="▤"
          tone="blue"
        />
        <StatCard
          label="UNITS IN USE"
          value={String(
            new Set(products.map((product) => product.unit).filter(Boolean))
              .size,
          )}
          detail="Distinct recorded units"
          icon="◉"
          tone="purple"
        />
      </section>
    );
  }
  const deliveries = entries.filter((entry) => entry.type === "delivery"),
    today = householdDateKey(new Date()),
    month = householdMonthKey(new Date());
  return (
    <section className="stat-grid phase-summary" aria-label="Delivery summary">
      <StatCard
        label="TODAY’S RECORDS"
        value={String(
          deliveries.filter((entry) => householdDateKey(entry.date) === today)
            .length,
        )}
        detail="Deliveries dated today"
        icon="◷"
        tone="blue"
      />
      <StatCard
        label="THIS MONTH"
        value={String(
          deliveries.filter((entry) => householdMonthKey(entry.date) === month)
            .length,
        )}
        detail="Saved delivery records"
        icon="▤"
        tone="purple"
      />
    </section>
  );
}

function StatusFilter({
  value,
  onChange,
  count,
}: {
  value: string;
  onChange: (value: string) => void;
  count: number;
}) {
  return (
    <div className="ledger-filters">
      <label htmlFor="ledger-status-filter">
        Status
        <select
          id="ledger-status-filter"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="all">All statuses</option>
          {["recorded", "pending", "paid", "upcoming", "present", "absent"].map(
            (status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ),
          )}
        </select>
      </label>
      <span>
        {count} {count === 1 ? "record" : "records"}
      </span>
    </div>
  );
}

function MonthlyReport({
  entries,
  month,
  loading,
  statusFilter,
  onStatusChange,
  onView,
  edit,
  remove,
}: {
  entries: Entry[];
  month: string;
  loading: boolean;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onView: (section: Section) => void;
  edit: (entry: Entry) => void;
  remove: (entry: Entry) => void;
}) {
  const spend = entries
    .filter(
      (e) =>
        ["expense", "bill", "salary", "delivery"].includes(e.type) &&
        !["pending", "upcoming"].includes(e.status),
    )
    .reduce((sum, e) => sum + e.amount, 0);
  return (
    <>
      <section className="stat-grid">
        <StatCard
          label="RECORDED OUTFLOW"
          value={money(spend)}
          detail={monthTitle(month)}
          icon="₹"
        />
        <StatCard
          label="RECORDS IN PERIOD"
          value={String(entries.length)}
          detail="Saved records dated in selected month"
          icon="▤"
          tone="blue"
        />
        <StatCard
          label="DELIVERY RECORDS"
          value={String(entries.filter((e) => e.type === "delivery").length)}
          detail="In selected month"
          icon="◷"
          tone="purple"
        />
      </section>
      <div className="dashboard-grid">
        <SpendingTrend entries={entries} selectedMonth={month} />
        <CategoryBreakdown
          entries={entries}
          onView={onView}
          selectedMonth={month}
        />
      </div>
      <section className="panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>Monthly activity</h2>
            <p>Records dated in {monthTitle(month)}.</p>
          </div>
        </div>
        <StatusFilter
          value={statusFilter}
          onChange={onStatusChange}
          count={entries.length}
        />
        {loading ? (
          <LoadingState label="Loading report records…" />
        ) : (
          <EntryTable entries={entries} edit={edit} remove={remove} />
        )}
      </section>
    </>
  );
}

function SettingsWorkspace({
  user,
  email,
  householdId,
  onSignOut,
}: {
  user: string;
  email: string;
  householdId: string;
  onSignOut: () => void;
}) {
  return (
    <section className="panel settings-workspace">
      <div className="panel-heading">
        <div>
          <h2>Account and household</h2>
          <p>Signed in as {user}</p>
        </div>
      </div>
      <div className="settings-account-details"><strong>ACCOUNT</strong><span>{user}</span><span>{email}</span><span>Household ID · {householdId}</span></div>
      <div className="settings-notice">
        <strong>Household preferences aren’t available yet.</strong>
        <p>
          The API does not expose profile, household, reminder, or preference settings yet.
        </p>
      </div>
      <button className="button button-secondary" onClick={onSignOut}>
        Sign out
      </button>
    </section>
  );
}

function AuthScreen({
  onAuth,
  notice,
}: {
  onAuth: (name: string, email: string, householdId: string) => void;
  notice?: string;
}) {
  const resetToken = useMemo(
    () => new URLSearchParams(window.location.search).get("resetToken") || "",
    [],
  );
  const [mode, setMode] = useState<"signin" | "signup" | "request" | "reset">(
      () => (resetToken ? "reset" : "signin"),
    ),
    [name, setName] = useState(""),
    [householdName, setHouseholdName] = useState("Home"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "request") {
        const result = await api.requestPasswordReset(email);
        setInfo(result.data.message);
        return;
      }
      if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
        const result = await api.resetPassword(resetToken, password);
        window.history.replaceState({}, "", window.location.pathname);
        setPassword("");
        setConfirmPassword("");
        setMode("signin");
        setInfo(result.data.message);
        return;
      }
      const result = await api.auth(signup ? "signup" : "signin", {
        ...(signup ? { name, householdName } : {}),
        email,
        password,
      });
      setToken(result.data.accessToken);
      onAuth(result.data.user.name, result.data.user.email, result.data.user.householdId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete this request",
      );
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: "signin" | "signup" | "request") {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }
  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "request"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : "Welcome back";
  const description =
    mode === "signup"
      ? "Set up your household to get started."
      : mode === "request"
        ? "Enter your account email and we’ll send a reset link."
        : mode === "reset"
          ? "Choose a new password for your account."
          : "Sign in to manage your household ledger.";
  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} aria-busy={busy}>
        <div className="brand-mark" aria-hidden="true">
          d<span>.</span>
        </div>
        <span className="eyebrow">HOUSEHOLD MANAGEMENT</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {signup && (
          <>
            <label htmlFor="auth-name">
              Your name
              <input
                id="auth-name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label htmlFor="household-name">
              Household name
              <input
                id="household-name"
                required
                minLength={2}
                maxLength={80}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                autoComplete="organization"
              />
            </label>
          </>
        )}
        {mode !== "reset" && (
          <label htmlFor="auth-email">
            Email
            <input
              id="auth-email"
              required
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        )}
        {["signin", "signup", "reset"].includes(mode) && (
          <label htmlFor="auth-password">
            {mode === "reset" ? "New password" : "Password"}
            <div className="password-input-wrap">
              <input
                id="auth-password"
                required
                minLength={signup || mode === "reset" ? 12 : 1}
                maxLength={128}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {(signup || mode === "reset") && (
              <small>Use at least 12 characters.</small>
            )}
          </label>
        )}
        {mode === "reset" && (
          <label htmlFor="auth-confirm-password">
            Confirm new password
            <input
              id="auth-confirm-password"
              required
              minLength={12}
              maxLength={128}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {notice && mode === "signin" && (
          <div className="session-notice" role="status">
            {notice}
          </div>
        )}
        {info && (
          <div className="session-notice" role="status">
            {info}
          </div>
        )}
        {error && (
          <div className="form-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <button disabled={busy} className="button button-primary auth-submit">
          {busy
            ? "Please wait…"
            : signup
              ? "Create account"
              : mode === "request"
                ? "Send reset link"
                : mode === "reset"
                  ? "Update password"
                  : "Sign in"}
        </button>
        {mode === "signin" && (
          <>
            <button
              type="button"
              className="auth-switch"
              onClick={() => switchMode("request")}
            >
              Forgot your password?
            </button>
            <button
              type="button"
              className="auth-switch"
              onClick={() => switchMode("signup")}
            >
              New to Daily Ledger? Create an account
            </button>
          </>
        )}
        {mode === "signup" && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("signin")}
          >
            Already registered? Sign in
          </button>
        )}
        {mode === "request" && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("signin")}
          >
            Back to sign in
          </button>
        )}
        {mode === "reset" && !resetToken && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("request")}
          >
            Request a new reset link
          </button>
        )}
      </form>
    </main>
  );
}

function App() {
  const [active, setActiveState] = useState<Section>(() =>
    sectionFromPath(window.location.pathname),
  );
  const [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [entries, setEntries] = useState<Entry[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [staff, setStaff] = useState<StaffMember[]>([]),
    [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]),
    [overviewBill, setOverviewBill] = useState<MonthlyBill | null>(null),
    [overviewSalaries, setOverviewSalaries] = useState<SalaryCalculation[]>([]),
    [todayDeliveries, setTodayDeliveries] = useState<ScheduledDelivery[]>([]),
    [overviewLoading, setOverviewLoading] = useState(false),
    [overviewError, setOverviewError] = useState(""),
    [overviewReload, setOverviewReload] = useState(0),
    [productCreateRequested, setProductCreateRequested] = useState(false),
    [user, setUser] = useState(""),
    [userEmail, setUserEmail] = useState(""),
    [householdId, setHouseholdId] = useState(""),
    [loading, setLoading] = useState(true),
    [entriesLoading, setEntriesLoading] = useState(false),
    [error, setError] = useState(""),
    [authNotice, setAuthNotice] = useState(""),
    [formOpen, setFormOpen] = useState(false),
    [formType, setFormType] = useState("expense"),
    [payingEntry, setPayingEntry] = useState<Entry | null>(null),
    [paymentBusy, setPaymentBusy] = useState(false),
    [paymentError, setPaymentError] = useState(""),
    [toast, setToast] = useState(""),
    [quickAddOpen, setQuickAddOpen] = useState(false),
    [headerMenu, setHeaderMenu] = useState<"notifications" | "profile" | null>(
      null,
    ),
    [showAllActivity, setShowAllActivity] = useState(false),
    [selectedMonth, setSelectedMonth] = useState(() =>
      householdMonthKey(new Date()),
    );
  const [editing, setEditing] = useState<Entry | null>(null);
  const setActive = (section: Section) => {
    setActiveState(section);
    const path = sectionPath(section);
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  };
  useEffect(() => {
    const syncFromHistory = () => {
      setActiveState(sectionFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  useEffect(() => {
    const canonicalPath = sectionPath(active);
    if (window.location.pathname !== canonicalPath) window.history.replaceState({}, "", canonicalPath);
  }, [active]);
  useEffect(() => {
    setStatusFilter("all");
  }, [active]);
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 2800);
  };
  const load = async () => {
    setEntriesLoading(true);
    try {
      const currentMonth = householdMonthKey(new Date());
      const [ledgerEntries, productEntries, staffEntries] = await Promise.all([api.entries(), api.products(), api.staff()]);
      const attendanceEntries = await api.attendance(currentMonth);
      setEntries(ledgerEntries);
      setProducts(productEntries);
      setStaff(staffEntries);
      setAttendanceRecords(attendanceEntries);
      setError("");
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setToken(null);
        setUser("");
        setUserEmail("");
        setHouseholdId("");
        setAuthNotice(e.message);
      } else
        setError(e instanceof Error ? e.message : "Unable to load entries");
    } finally {
      setEntriesLoading(false);
    }
  };
  useEffect(() => {
    (async () => {
      const hadPriorSession = hadSession();
      try {
        if (getToken()) {
          const res = await api.me();
          setUser(res.data.name);
          setUserEmail(res.data.email);
          setHouseholdId(res.data.householdId);
        } else {
          const result = await api.refresh();
          setToken(result.data.accessToken);
          const res = await api.me();
          setUser(res.data.name);
          setUserEmail(res.data.email);
          setHouseholdId(res.data.householdId);
        }
      } catch {
        if (hadPriorSession)
          setAuthNotice("Your session expired. Sign in again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (user) void load();
  }, [user]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError("");
    setOverviewBill(null);
    setOverviewSalaries([]);
    const today = householdDateKey(new Date());
    Promise.all([
      api.prepareBill(selectedMonth),
      api.salaries(selectedMonth),
    ]).then(async ([bill, salaryResult]) => {
      const todayResult = selectedMonth === householdMonthKey(new Date())
        ? { items: await api.scheduledDeliveries(today, today) }
        : await api.generateScheduledDeliveries(today, today);
      if (cancelled) return;
      setOverviewBill(bill);
      setOverviewSalaries(salaryResult.statements);
      setTodayDeliveries(todayResult.items);
    }).catch((reason) => {
      if (cancelled) return;
      setOverviewError(reason instanceof Error ? reason.message : "Unable to load overview data");
      if (reason instanceof SessionExpiredError) {
        setToken(null);
        setUser("");
        setUserEmail("");
        setHouseholdId("");
        setAuthNotice(reason.message);
      }
    }).finally(() => {
      if (!cancelled) setOverviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, selectedMonth, overviewReload]);
  const sectionTypes =
    typesFor[active] || (typeFor[active] ? [typeFor[active]] : undefined);
  const filtered = useMemo(
    () =>
      entries.filter(
        (x) =>
          (!sectionTypes || sectionTypes.includes(x.type)) &&
          (statusFilter === "all" || x.status === statusFilter) &&
          `${x.name} ${x.category} ${x.notes}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [entries, sectionTypes, statusFilter, search],
  );
  const monthEntries = useMemo(
    () => entries.filter((e) => householdMonthKey(e.date) === selectedMonth),
    [entries, selectedMonth],
  );
  const spend = monthEntries
    .filter(
      (e) =>
        ["expense", "bill", "salary", "delivery"].includes(e.type) &&
        !["pending", "upcoming"].includes(e.status),
    )
    .reduce((a, e) => a + e.amount, 0);
  const reportEntries = useMemo(
    () => filtered.filter((e) => householdMonthKey(e.date) === selectedMonth),
    [filtered, selectedMonth],
  );
  const notifications = entries
    .filter((e) => ["pending", "upcoming"].includes(e.status))
    .slice(0, 5);
  const startAdd = (section = active, initialType?: string) => {
    setActive(section);
    setFormType(initialType || typeFor[section] || "expense");
    setEditing(null);
    setQuickAddOpen(false);
    setFormOpen(true);
  };
  const requestProductCreate = () => {
    setActive("Products & Rates");
    setProductCreateRequested(true);
    setQuickAddOpen(false);
  };
  const openEntry = (entry: Entry) => {
    const section =
      entry.type === "attendance"
        ? "Staff & Attendance"
        : groups.flatMap((g) => g.items).find((i) => i.type === entry.type)
            ?.name || "Household Expenses";
    setActive(section);
    setFormType(entry.type);
    setEditing(entry);
    setFormOpen(true);
  };
  const signOut = async () => {
    try {
      await api.signout();
    } catch {
    } finally {
      setToken(null);
      clearSessionMarker();
      setUser("");
      setUserEmail("");
      setHouseholdId("");
      setAuthNotice("");
    }
  };
  function markPaid(entry: Entry) {
    setPayingEntry(entry);
    setPaymentError("");
  }
  async function confirmMarkPaid() {
    if (!payingEntry) return;
    setPaymentBusy(true);
    setPaymentError("");
    try {
      await api.updateEntry(payingEntry._id, { status: "paid" });
      await load();
      notify(`${payingEntry.name} marked paid`);
      setPayingEntry(null);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Unable to update payment",
      );
    } finally {
      setPaymentBusy(false);
    }
  }
  async function saveEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sectionType = typeFor[active] || "expense";
    const payload: EntryInput = {
      type: editing?.type || String(form.get("type") || sectionType),
      name: String(form.get("name")),
      category: String(form.get("category") || "General"),
      amount: Number(form.get("amount") || 0),
      quantity: Number(form.get("quantity") || 0),
      unit: String(form.get("unit") || ""),
      date: String(form.get("date")),
      status: String(form.get("status") || "recorded"),
      notes: String(form.get("notes") || ""),
    };
    const due = String(form.get("dueDate") || "");
    if (due) payload.dueDate = due;
    try {
      if (editing) await api.updateEntry(editing._id, payload);
      else await api.createEntry(payload);
      setFormOpen(false);
      setEditing(null);
      await load();
      notify(editing ? "Entry updated" : "Entry saved");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to save entry");
    }
  }
  async function remove(entry: Entry) {
    const matchingDeliveries =
      entry.type === "product"
        ? entries.filter(
            (item) => item.type === "delivery" && item.name === entry.name,
          ).length
        : 0;
    const detail = matchingDeliveries
      ? ` ${matchingDeliveries} delivery record${matchingDeliveries === 1 ? "" : "s"} with the same name will remain in the ledger.`
      : "";
    if (!window.confirm(`Delete “${entry.name}” from the ledger?${detail}`))
      return;
    try {
      await api.deleteEntry(entry._id);
      await load();
      notify("Entry deleted");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to delete entry");
    }
  }
  if (loading)
    return (
      <main className="auth-screen">
        <LoadingState label="Connecting to your household ledger…" />
      </main>
    );
  if (!user)
    return (
      <AuthScreen
        notice={authNotice}
        onAuth={(name, email, nextHouseholdId) => {
          setAuthNotice("");
          setUser(name);
          setUserEmail(email);
          setHouseholdId(nextHouseholdId);
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            d<span>.</span>
          </div>
          <div>
            <div className="brand-name">daily ledger</div>
            <div className="brand-caption">HOUSEHOLD MANAGEMENT</div>
          </div>
        </div>
        <div className="household-switch">
          <div className="household-avatar">H</div>
          <div className="household-copy">
            <strong>My household</strong>
            <span>Household owner</span>
          </div>
        </div>
        <nav className="side-nav">
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <div className="nav-label">{g.title}</div>
              {g.items.map((i) => (
                <button
                  key={i.name}
                  className={`nav-item ${active === i.name ? "active" : ""}`}
                  aria-current={active === i.name ? "page" : undefined}
                  onClick={() => setActive(i.name)}
                >
                  <span className="nav-icon">{i.icon}</span>
                  <span>{i.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="profile-row">
          <div className="profile-avatar">{user.slice(0, 2).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{user}</strong>
            <span>Household owner</span>
          </div>
          <button className="more-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {[
          { name: "Overview" as Section, icon: "home" as const, label: "Home" },
          { name: "Deliveries" as Section, icon: "deliveries" as const, label: "Deliveries" },
          { name: "Monthly Bills" as Section, icon: "bills" as const, label: "Bills" },
          { name: "Staff & Attendance" as Section, icon: "staff" as const, label: "Staff" },
        ].map((item) => (
          <button
            key={item.name}
            className={active === item.name ? "active" : ""}
            aria-current={active === item.name ? "page" : undefined}
            onClick={() => setActive(item.name)}
          >
            <span><MobileTabIcon name={item.icon} active={active === item.name} /></span>
            <small>{item.label}</small>
          </button>
        ))}
        <button
          className={active === "More" || !["Overview", "Deliveries", "Monthly Bills", "Staff & Attendance"].includes(active) ? "active" : ""}
          aria-current={active === "More" ? "page" : undefined}
          onClick={() => setActive("More")}
        >
          <span><MobileTabIcon name="more" active={active === "More" || !["Overview", "Deliveries", "Monthly Bills", "Staff & Attendance"].includes(active)} /></span>
          <small>More</small>
        </button>
      </nav>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            {active !== "Settings" && (
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Search ledger"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ledger…"
                />
              </label>
            )}
            <div
              className="header-menu-wrap"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setHeaderMenu(null);
              }}
            >
              <button
                className="icon-button notification"
                aria-label={`Notifications${notifications.length ? `, ${notifications.length} pending` : ""}`}
                aria-expanded={headerMenu === "notifications"}
                aria-controls="notifications-panel"
                onClick={() =>
                  setHeaderMenu((v) =>
                    v === "notifications" ? null : "notifications",
                  )
                }
              >
                ♧{notifications.length > 0 && <i />}
              </button>
              {headerMenu === "notifications" && (
                <div
                  className="header-popover notification-panel"
                  id="notifications-panel"
                  role="region"
                  aria-label="Notifications"
                >
                  <div className="popover-heading">
                    <strong>Needs attention</strong>
                    <button
                      aria-label="Close notifications"
                      onClick={() => setHeaderMenu(null)}
                    >
                      ×
                    </button>
                  </div>
                  {notifications.length ? (
                    notifications.map((item) => (
                      <button
                        className="notification-item"
                        key={item._id}
                        onClick={() => {
                          setHeaderMenu(null);
                          openEntry(item);
                        }}
                      >
                        <span className="notification-dot">◷</span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.type} · {item.status}
                          </small>
                        </span>
                        <b>→</b>
                      </button>
                    ))
                  ) : (
                    <p className="notifications-empty">You’re all caught up.</p>
                  )}
                </div>
              )}
            </div>
            <div className="top-divider" />
            <div
              className="header-menu-wrap"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setHeaderMenu(null);
              }}
            >
              <button
                className="top-profile"
                aria-expanded={headerMenu === "profile"}
                aria-controls="profile-panel"
                onClick={() =>
                  setHeaderMenu((v) => (v === "profile" ? null : "profile"))
                }
              >
                <span className="profile-avatar small">
                  {user.slice(0, 2).toUpperCase()}
                </span>
                <span className="top-profile-name">{user}</span>
                <span className="chevron">⌄</span>
              </button>
              {headerMenu === "profile" && (
                <div
                  className="header-popover profile-panel"
                  id="profile-panel"
                  role="region"
                  aria-label="Account options"
                >
                  <p>
                    Signed in as <strong>{user}</strong>
                  </p>
                  <button
                    onClick={() => {
                      setHeaderMenu(null);
                      void signOut();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">
          {!['Overview', 'Deliveries', 'Monthly Bills', 'Staff & Attendance', 'More'].includes(active) && (
            <button className="mobile-back-more" onClick={() => setActive("More")}>‹&nbsp; More</button>
          )}
          <div className={`welcome-row ${active === "Overview" ? "overview-welcome-row" : ""}`}>
            <div>
              <div className="eyebrow desktop-page-eyebrow">
                {new Date()
                  .toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })
                  .toUpperCase()}
              </div>
              <div className="eyebrow mobile-page-eyebrow">{mobileHeadings[active].eyebrow}</div>
              <h1 className="desktop-page-title">{active === "Overview" ? `Good day, ${user}` : active}</h1>
              <h1 className="mobile-page-title">{active === "Overview" ? `Good day, ${user.split(" ")[0]}` : mobileHeadings[active].title}</h1>
              <p className="page-subtitle desktop-page-subtitle">
                {active === "Overview" ? "Your household ledger, kept up to date." : `Manage ${active.toLowerCase()} for your household.`}
              </p>
              <p className="page-subtitle mobile-page-subtitle">{mobileHeadings[active].subtitle}</p>
            </div>
            <div className="welcome-actions">
              {active !== "Overview" &&
                !["Reports", "Settings", "Products & Rates", "Deliveries", "Monthly Bills"].includes(active) && (
                  <button
                    className="button button-primary"
                    onClick={() => startAdd()}
                  >
                    ＋ Add entry
                  </button>
                )}
              <div
                className="quick-add-wrap"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setQuickAddOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuickAddOpen(false);
                    e.currentTarget.querySelector("button")?.focus();
                  }
                }}
              >
                <button
                  className="button button-primary"
                  aria-expanded={quickAddOpen}
                  aria-controls="quick-add-menu"
                  onClick={() => setQuickAddOpen((v) => !v)}
                >
                  ＋ Quick add
                </button>
                {quickAddOpen && (
                  <div
                    className="quick-add-menu"
                    id="quick-add-menu"
                    role="group"
                    aria-label="Quick add actions"
                  >
                    {[
                      {
                        label: "Record a delivery",
                        section: "Deliveries" as Section,
                        initialType: "delivery",
                        icon: "◷",
                      },
                      {
                        label: "Add household expense",
                        section: "Household Expenses" as Section,
                        initialType: "expense",
                        icon: "₹",
                      },
                      {
                        label: "Mark staff attendance",
                        section: "Staff & Attendance" as Section,
                        initialType: "attendance",
                        icon: "♙",
                      },
                      {
                        label: "Add a product",
                        section: "Products & Rates" as Section,
                        initialType: "product",
                        icon: "▤",
                      },
                    ].map((item) => (
                      <button
                        key={item.section}
                        onClick={() => {
                          if (item.section === "Products & Rates") {
                            requestProductCreate();
                            return;
                          }
                          if (item.section === "Deliveries") {
                            setActive("Deliveries");
                            setQuickAddOpen(false);
                            return;
                          }
                          if (item.section === "Staff & Attendance") {
                            setActive("Staff & Attendance");
                            setQuickAddOpen(false);
                            return;
                          }
                          startAdd(item.section, item.initialType);
                        }}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {(active === "Overview" || active === "Reports" || active === "Monthly Bills") && (
            <div className="dashboard-toolbar desktop-month-picker">
              <label htmlFor="dashboard-month">
                {active === "Reports" ? "Report month" : active === "Monthly Bills" ? "Bill month" : "Dashboard month"}
              </label>
              <input
                id="dashboard-month"
                type="month"
                value={selectedMonth}
                onChange={(e) =>
                  e.target.value && setSelectedMonth(e.target.value)
                }
              />
            </div>
          )}
          {(active === "Overview" || active === "Reports" || active === "Monthly Bills") && (
            <MobileMonthPicker month={selectedMonth} onChange={setSelectedMonth} label={active === "Reports" ? "Report month" : active === "Monthly Bills" ? "Bill month" : "Dashboard month"} />
          )}
          {error && (
            <div className="api-error" role="alert">
              <strong>API connection issue</strong>
              <span>{error}</span>
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {active === "More" ? (
            <section className="mobile-more-screen" aria-label="More sections">
              {[
                { name: "Salary Management" as Section, title: "Salary management", description: "Attendance-based salary estimates", icon: "₹" },
                { name: "Products & Rates" as Section, title: "Products & rates", description: "View household products and delivery schedules", icon: "▤" },
                { name: "Household Expenses" as Section, title: "Household expenses", description: "Review and add manual expenses", icon: "↗" },
                { name: "Reports" as Section, title: "Reports", description: "Monthly activity, status filters, and outflow", icon: "▥" },
                { name: "Settings" as Section, title: "Settings", description: "Account details and available preferences", icon: "⚙" },
              ].map((item) => (
                <button className="mobile-more-card" key={item.name} onClick={() => setActive(item.name)}>
                  <span className="mobile-more-icon" aria-hidden="true">{item.icon}</span>
                  <span className="mobile-more-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                  <span className="mobile-more-arrow" aria-hidden="true">›</span>
                </button>
              ))}
              <section className="panel mobile-more-account"><small>SIGNED IN AS</small><strong>{user}</strong><span>{userEmail}</span></section>
              <button className="mobile-more-signout" onClick={() => void signOut()}>Sign out</button>
            </section>
          ) : active === "Overview" ? (
            <>
              <section className="stat-grid overview-stat-grid">
                <StatCard
                  className="mobile-hide-stat"
                  label="LEDGER OUTFLOW"
                  value={money(spend)}
                  detail={`Manual ledger records · ${monthTitle(selectedMonth)}`}
                  icon="₹"
                  onClick={() => setActive("Household Expenses")}
                />
                <StatCard
                  label="DELIVERED CHARGES"
                  value={overviewLoading ? "…" : overviewBill ? money(overviewBill.totals.totalAmount) : "—"}
                  detail={`Scheduled-date rates · ${monthTitle(selectedMonth)}`}
                  icon="₹"
                  tone="green"
                  onClick={() => setActive("Monthly Bills")}
                />
                <StatCard
                  label="ESTIMATED NET SALARY"
                  value={overviewLoading ? "…" : money(overviewSalaries.reduce((sum, statement) => sum + statement.netPayable, 0))}
                  detail={`${overviewSalaries.length} staff statements`}
                  icon="₹"
                  tone="purple"
                  onClick={() => setActive("Salary Management")}
                />
                <StatCard
                  label="SCHEDULED ITEMS"
                  value={overviewLoading ? "…" : String(overviewBill?.totals.scheduledCount ?? 0)}
                  detail={monthTitle(selectedMonth)}
                  icon="◷"
                  tone="blue"
                  onClick={() => setActive("Deliveries")}
                />
                <StatCard
                  label="OPEN DELIVERY ITEMS"
                  value={overviewLoading ? "…" : String(overviewBill?.products.reduce((count, product) => count + product.lines.filter((line) => line.status === "pending" || line.status === "partially_delivered").length, 0) ?? 0)}
                  detail={`Pending or partial · ${monthTitle(selectedMonth)}`}
                  icon="◷"
                  tone="orange"
                  onClick={() => setActive("Deliveries")}
                />
                <StatCard
                  className="mobile-only-stat"
                  label="OUTSTANDING ESTIMATE"
                  value={overviewLoading ? "…" : overviewBill ? money(overviewBill.totals.totalOutstandingEstimate) : "—"}
                  detail={`${overviewBill?.products.reduce((count, product) => count + product.lines.filter((line) => line.status === "pending" || line.status === "partially_delivered").length, 0) ?? 0} open delivery items`}
                  icon="◷"
                  tone="orange"
                  onClick={() => setActive("Monthly Bills")}
                />
              </section>
              <section className="panel mobile-ledger-summary">
                <div className="panel-heading"><div><h2>Ledger outflow</h2><p>Manual entries · {monthTitle(selectedMonth)}</p></div><strong>{money(spend)}</strong></div>
                <p>Manual ledger totals are shown separately from calculated product charges and salary.</p>
              </section>
              {overviewError && <div className="api-error" role="alert"><strong>Some overview data could not be loaded</strong><span>{overviewError}</span><button onClick={() => setOverviewReload((value) => value + 1)}>Retry</button></div>}
              <div className="dashboard-grid overview-mobile-panels">
                <SpendingTrend
                  entries={entries}
                  selectedMonth={selectedMonth}
                />
                <CategoryBreakdown
                  entries={entries}
                  onView={setActive}
                  selectedMonth={selectedMonth}
                />
                <TodayOperations deliveries={todayDeliveries} attendanceRecords={attendanceRecords} staff={staff} onView={setActive} />
                <UpcomingPayments entries={entries} onPay={markPaid} />
              </div>
              <section className="panel mobile-delivery-status">
                <div className="panel-heading"><div><h2>Delivery status</h2><p>Scheduled items this month</p></div><span className="reminder-count">{overviewBill?.products.reduce((count, product) => count + product.lines.filter((line) => line.status === "pending" || line.status === "partially_delivered").length, 0) ?? 0} open</span></div>
                {overviewBill?.products.length ? overviewBill.products.slice(0, 4).map((product) => <div className="mobile-delivery-row" key={product.productId}><div><strong>{product.productName}</strong><small>{product.deliveredQuantity} {product.unit} delivered · {product.outstandingQuantity} {product.unit} outstanding</small></div><b>{money(product.deliveredAmount)}</b></div>) : <p>No scheduled product deliveries in {monthTitle(selectedMonth)}.</p>}
              </section>
              <section className="panel transactions-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent ledger entries</h2>
                    <p>Manual records for this household</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setShowAllActivity((v) => !v)}
                  >
                    {showAllActivity ? "Show recent" : "View all activity"} →
                  </button>
                </div>
                {entriesLoading ? (
                  <LoadingState label="Loading recent activity…" />
                ) : (
                  <EntryTable
                    entries={showAllActivity ? filtered : filtered.slice(0, 5)}
                    edit={openEntry}
                    remove={remove}
                  />
                )}
              </section>
              <button className="mobile-overview-refresh" onClick={() => { void load(); setOverviewReload((value) => value + 1); }}>Refresh overview</button>
            </>
          ) : active === "Reports" ? (
            <MonthlyReport
              entries={reportEntries}
              month={selectedMonth}
              loading={entriesLoading}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onView={setActive}
              edit={openEntry}
              remove={remove}
            />
          ) : active === "Settings" ? (
            <SettingsWorkspace user={user} email={userEmail} householdId={householdId} onSignOut={() => void signOut()} />
          ) : active === "Products & Rates" ? (
            <ProductsWorkspace
              products={products}
              legacyEntries={entries.filter((entry) => entry.type === "product")}
              loading={entriesLoading}
              onReload={load}
              createRequested={productCreateRequested}
              onCreateHandled={() => setProductCreateRequested(false)}
            />
          ) : active === "Deliveries" ? (
            <DeliveriesWorkspace
              month={selectedMonth}
              products={products}
              legacyEntries={entries.filter((entry) => entry.type === "delivery")}
              onMonthChange={setSelectedMonth}
              onAddProduct={requestProductCreate}
            />
          ) : active === "Monthly Bills" ? (
            <MonthlyBillsWorkspace
              month={selectedMonth}
              legacyEntries={entries.filter((entry) => entry.type === "bill" && householdMonthKey(entry.date) === selectedMonth)}
            />
          ) : active === "Staff & Attendance" ? (
            <StaffWorkspace
              staff={staff}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              onReload={load}
              onOpenSalary={() => setActive("Salary Management")}
            />
          ) : active === "Salary Management" ? (
            <SalaryWorkspace
              staff={staff}
              month={selectedMonth}
              legacyEntries={entries.filter((entry) => entry.type === "salary" && householdMonthKey(entry.date) === selectedMonth)}
              onMonthChange={setSelectedMonth}
              onOpenAttendance={() => setActive("Staff & Attendance")}
            />
          ) : (
            <>
              <div className="desktop-expenses-flow">
              <section className="panel transactions-panel module-ledger">
                <div className="panel-heading">
                  <div>
                    <h2>{active} ledger</h2>
                    <p>
                      {filtered.length} saved{" "}
                      {filtered.length === 1 ? "entry" : "entries"}.
                    </p>
                  </div>
                  <button
                    className="button button-primary"
                    onClick={() => startAdd()}
                  >
                    ＋ Add entry
                  </button>
                </div>
                {featureLimitations[active] && (
                  <div className="feature-limit" role="note">
                    {featureLimitations[active]}
                  </div>
                )}
                <StatusFilter
                  value={statusFilter}
                  onChange={setStatusFilter}
                  count={filtered.length}
                />
                {entriesLoading ? (
                  <LoadingState label={`Loading ${active.toLowerCase()}…`} />
                ) : (
                  <EntryTable
                    entries={filtered}
                    edit={openEntry}
                    remove={remove}
                  />
                )}
              </section>
              </div>
              <MobileExpensesWorkspace />
            </>
          )}
          <footer className="page-footer">
            <span>© 2026 Daily Ledger</span>
            <span>Entries are stored in your household database</span>
          </footer>
        </div>
      </main>
      {formOpen && (
        <EntryForm
          key={`${editing?._id || active}-${formType}`}
          active={active}
          entry={editing}
          initialType={formType}
          products={entries.filter((entry) => entry.type === "product")}
          close={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          save={saveEntry}
        />
      )}
      {payingEntry && (
        <ConfirmDialog
          title={`Mark “${payingEntry.name}” as paid?`}
          description={`This will save a paid status for ${money(payingEntry.amount)} in the household ledger. This operation isn’t a payment transfer.`}
          confirmLabel="Mark as paid"
          busy={paymentBusy}
          error={paymentError}
          onConfirm={() => void confirmMarkPaid()}
          onCancel={() => {
            setPayingEntry(null);
            setPaymentError("");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

type EntrySort = "name" | "type" | "date" | "amount" | "status";
const entryTypeLabel: Record<string, string> = {
  delivery: "Delivery",
  product: "Product",
  expense: "Expense",
  bill: "Bill",
  staff: "Staff",
  attendance: "Attendance",
  salary: "Salary",
};
function EntryTable({
  entries,
  edit,
  remove,
  pageSize = 10,
}: {
  entries: Entry[];
  edit: (e: Entry) => void;
  remove: (e: Entry) => void;
  pageSize?: number;
}) {
  const [sortBy, setSortBy] = useState<EntrySort>("date"),
    [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [entries]);
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "date")
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        else if (sortBy === "amount") comparison = a.amount - b.amount;
        else
          comparison = String(a[sortBy] || "").localeCompare(
            String(b[sortBy] || ""),
          );
        return sortDirection === "asc" ? comparison : -comparison;
      }),
    [entries, sortBy, sortDirection],
  );
  const pages = Math.ceil(sorted.length / pageSize),
    visible = sorted.slice(page * pageSize, (page + 1) * pageSize),
    start = sorted.length ? page * pageSize + 1 : 0,
    end = Math.min((page + 1) * pageSize, sorted.length),
    amountLabel =
      entries.length && entries.every((e) => e.type === "product")
        ? "CURRENT RATE"
        : entries.length && entries.every((e) => e.type === "staff")
          ? "MONTHLY SALARY"
          : "AMOUNT";
  const changeSort = (key: EntrySort) => {
    if (key === sortBy) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDirection(
        key === "name" || key === "type" || key === "status" ? "asc" : "desc",
      );
    }
  };
  const sortIndicator = (key: EntrySort) =>
    key !== sortBy ? "↕" : sortDirection === "asc" ? "↑" : "↓";
  const sortHeader = (key: EntrySort, label: string) => (
    <th
      scope="col"
      aria-sort={
        sortBy === key
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button className="sort-trigger" onClick={() => changeSort(key)}>
        {label}
        <span aria-hidden="true">{sortIndicator(key)}</span>
      </button>
    </th>
  );
  return (
    <div className="table-wrap">
      {sorted.length ? (
        <>
          <div className="table-sort-mobile">
            <label>
              Sort by
              <select
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value as EntrySort;
                  setSortBy(next);
                }}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
              </select>
            </label>
            <button
              onClick={() =>
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
              }
            >
              {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">DESCRIPTION</th>
                {sortHeader("type", "TYPE")}
                {sortHeader("date", "DATE")}
                {sortHeader("amount", amountLabel)}
                {sortHeader("status", "STATUS")}
                <th scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e._id}>
                  <td data-label="">
                    <div className="transaction-name">
                      <span
                        className="transaction-icon mint"
                        aria-hidden="true"
                      >
                        {e.type === "delivery"
                          ? "◷"
                          : e.type === "product"
                            ? "▤"
                            : "₹"}
                      </span>
                      <span>
                        <strong>{e.name}</strong>
                        <small>
                          {e.category}
                          {e.quantity ? ` · ${e.quantity} ${e.unit}` : ""}
                          {e.type === "product" && e.unit
                            ? ` · per ${e.unit}`
                            : ""}
                          {e.dueDate ? ` · Due ${dateLabel(e.dueDate)}` : ""}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Type">{entryTypeLabel[e.type] || e.type}</td>
                  <td data-label="Date" className="date-cell">
                    {dateLabel(e.date)}
                  </td>
                  <td data-label={amountLabel}>
                    {money(e.amount)}
                    {e.type === "product" && e.unit ? ` / ${e.unit}` : ""}
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={e.status} />
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button
                        aria-label={`Edit ${e.name}`}
                        onClick={() => edit(e)}
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${e.name}`}
                        onClick={() => remove(e)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-pagination" role="status" aria-live="polite">
            <span>
              Showing {start}–{end} of {sorted.length}
            </span>
            {pages > 1 && (
              <div>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} of {pages}
                </span>
                <button
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>No entries match this view.</strong>
          <br />
          Adjust the search or status filter, or add a record.
        </div>
      )}
    </div>
  );
}

function EntryForm({
  active,
  entry,
  initialType,
  products,
  close,
  save,
}: {
  active: Section;
  entry: Entry | null;
  initialType: string;
  products: Entry[];
  close: () => void;
  save: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const [type, setType] = useState(
    entry?.type || initialType || typeFor[active] || "expense",
  );
  const [name, setName] = useState(entry?.name || ""),
    [unit, setUnit] = useState(entry?.unit || "");
  const dialogRef = useRef<HTMLFormElement>(null);
  const hasAmount = type !== "attendance",
    hasQuantity = type === "delivery",
    hasUnit = ["delivery", "product"].includes(type),
    amountLabel =
      type === "product"
        ? "Current rate per unit (₹)"
        : type === "staff"
          ? "Monthly salary (₹)"
          : type === "delivery"
            ? "Recorded charge, if known (₹)"
            : "Amount (₹)",
    dateFieldLabel =
      type === "staff"
        ? "Joining date"
        : type === "attendance"
          ? "Attendance date"
          : type === "product"
            ? "Rate set on"
            : type === "delivery"
              ? "Delivery date"
              : type === "expense"
                ? "Payment date"
                : type === "bill"
                  ? "Bill date"
                  : "Date",
    statusOptions =
      type === "attendance"
        ? ["present", "absent"]
        : ["recorded", "pending", "paid", "upcoming"],
    showStatus = !["product", "staff"].includes(type);
  function changeName(value: string) {
    setName(value);
    if (type === "delivery") {
      const product = products.find(
        (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
      );
      if (product) setUnit(product.unit);
    }
  }
  useEffect(() => {
    const dialog = dialogRef.current,
      previous = document.activeElement as HTMLElement | null;
    const first = dialog?.querySelector<HTMLElement>(
      "select:not(:disabled),input:not(:disabled),textarea:not(:disabled),button:not(:disabled)",
    );
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!items.length) return;
      const start = items[0],
        end = items[items.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    };
    dialog?.addEventListener("keydown", onKeyDown);
    return () => {
      dialog?.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="quick-modal entry-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-dialog-title"
        onSubmit={save}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {entry ? "EDIT ENTRY" : "NEW LEDGER ENTRY"}
            </span>
            <h2 id="entry-dialog-title">
              {entry ? "Update record" : "Add to your ledger"}
            </h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="Close entry form"
            onClick={close}
          >
            ×
          </button>
        </div>
        <label>
          Entry type
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!!entry}
          >
            {[
              ["delivery", "Delivery"],
              ["expense", "Household expense"],
              ["bill", "Monthly bill"],
              ["product", "Product & rate"],
              ["staff", "Staff member"],
              ["attendance", "Attendance"],
              ["salary", "Salary"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          {type === "product"
            ? "Product name"
            : type === "delivery"
              ? "Product or item"
              : "Name"}
          <input
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => changeName(e.target.value)}
            list={
              type === "delivery" && products.length
                ? "delivery-product-options"
                : undefined
            }
            autoComplete={type === "delivery" ? "off" : undefined}
            placeholder={
              type === "delivery"
                ? "Choose a product or enter an item"
                : "e.g. Electricity bill"
            }
          />
          {type === "delivery" && products.length > 0 && (
            <datalist id="delivery-product-options">
              {products.map((product) => (
                <option key={product._id} value={product.name} />
              ))}
            </datalist>
          )}
        </label>
        {type === "delivery" &&
          products.some(
            (product) =>
              product.name.toLowerCase() === name.trim().toLowerCase(),
          ) && (
            <p className="form-hint">
              This copies the product name and unit into the delivery record.
              The API does not keep a product link or calculate its bill.
            </p>
          )}
        <div className="form-grid">
          <label>
            Category
            <input
              name="category"
              maxLength={80}
              defaultValue={entry?.category}
              placeholder={type === "product" ? "e.g. Dairy" : "e.g. Groceries"}
            />
          </label>
          {hasAmount && (
            <label>
              {amountLabel}
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={entry?.amount || ""}
                placeholder="0.00"
                required={type === "product"}
              />
              {type === "delivery" && (
                <small>
                  Optional manual charge; it is not calculated from the product
                  rate.
                </small>
              )}
            </label>
          )}
          {hasQuantity && (
            <label>
              Delivered quantity
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={entry?.quantity || ""}
                required
              />
            </label>
          )}
          {hasUnit && (
            <label>
              Unit
              <input
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                list="common-units"
                placeholder="litre, kg, packet…"
                required
              />
              <datalist id="common-units">
                {["litre", "ml", "kg", "gram", "packet", "piece", "dozen"].map(
                  (value) => (
                    <option key={value} value={value} />
                  ),
                )}
              </datalist>
            </label>
          )}
        </div>
        <div className="form-grid">
          <label>
            {dateFieldLabel}
            <input
              name="date"
              type="date"
              required
              defaultValue={
                entry?.date?.slice(0, 10) || householdDateKey(new Date())
              }
            />
          </label>
          {["bill", "salary"].includes(type) && (
            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                defaultValue={entry?.dueDate?.slice(0, 10)}
              />
            </label>
          )}
          {showStatus && (
            <label>
              Status
              <select
                key={type}
                name="status"
                required
                defaultValue={
                  entry?.status || (type === "attendance" ? "" : "recorded")
                }
              >
                {type === "attendance" && (
                  <option value="" disabled>
                    Select status
                  </option>
                )}
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label>
          Notes
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={entry?.notes}
            rows={2}
            placeholder="Optional details"
          />
        </label>
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary">
            {entry ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default App;
