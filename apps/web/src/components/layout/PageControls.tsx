import { MobileMonthPicker } from "../MobileMonthPicker";
import { Section, mobileHeadings } from "../../app/sectionConfig";
import { PageHeaderProps } from "./PageHeaderProps";

export function PageControls(props: PageHeaderProps) {
  const {
    active,
    user,
    userEmail,
    entries,
    notifications,
    search,
    setSearch,
    headerMenu,
    setHeaderMenu,
    onSignOut,
    quickAddOpen,
    setQuickAddOpen,
    onNavigate,
    onStartAdd,
    onRequestProductCreate,
    onOpenEntry,
    selectedMonth,
    setSelectedMonth,
    error,
    onRetry,
  } = props;
  return (
    <>
      {![
        "Overview",
        "Deliveries",
        "Monthly Bills",
        "Staff & Attendance",
        "More",
      ].includes(active) && (
        <button className="mobile-back-more" onClick={() => onNavigate("More")}>
          ‹&nbsp; More
        </button>
      )}
      <div
        className={`welcome-row ${active === "Overview" ? "overview-welcome-row" : ""}`}
      >
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
          <div className="eyebrow mobile-page-eyebrow">
            {mobileHeadings[active].eyebrow}
          </div>
          <h1 className="desktop-page-title">
            {active === "Overview" ? `Good day, ${user}` : active}
          </h1>
          <h1 className="mobile-page-title">
            {active === "Overview"
              ? `Good day, ${user.split(" ")[0]}`
              : mobileHeadings[active].title}
          </h1>
          <p className="page-subtitle desktop-page-subtitle">
            {active === "Overview"
              ? "Your household ledger, kept up to date."
              : `Manage ${active.toLowerCase()} for your household.`}
          </p>
          <p className="page-subtitle mobile-page-subtitle">
            {mobileHeadings[active].subtitle}
          </p>
        </div>
        <div className="welcome-actions">
          {active !== "Overview" &&
            ![
              "Reports",
              "Settings",
              "Products & Rates",
              "Deliveries",
              "Monthly Bills",
            ].includes(active) && (
              <button
                className="button button-primary"
                onClick={() => onStartAdd()}
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
                        onRequestProductCreate();
                        return;
                      }
                      if (item.section === "Deliveries") {
                        onNavigate("Deliveries");
                        setQuickAddOpen(false);
                        return;
                      }
                      if (item.section === "Staff & Attendance") {
                        onNavigate("Staff & Attendance");
                        setQuickAddOpen(false);
                        return;
                      }
                      onStartAdd(item.section, item.initialType);
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
      {(active === "Overview" ||
        active === "Reports" ||
        active === "Monthly Bills") && (
        <div className="dashboard-toolbar desktop-month-picker">
          <label htmlFor="dashboard-month">
            {active === "Reports"
              ? "Report month"
              : active === "Monthly Bills"
                ? "Bill month"
                : "Dashboard month"}
          </label>
          <input
            id="dashboard-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
          />
        </div>
      )}
      {(active === "Overview" ||
        active === "Reports" ||
        active === "Monthly Bills") && (
        <MobileMonthPicker
          month={selectedMonth}
          onChange={setSelectedMonth}
          label={
            active === "Reports"
              ? "Report month"
              : active === "Monthly Bills"
                ? "Bill month"
                : "Dashboard month"
          }
        />
      )}
      {error && (
        <div className="api-error" role="alert">
          <strong>API connection issue</strong>
          <span>{error}</span>
          <button onClick={() => void onRetry()}>Retry</button>
        </div>
      )}
    </>
  );
}
