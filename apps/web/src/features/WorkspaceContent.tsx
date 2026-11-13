import { Dispatch, SetStateAction } from "react";
import {
  AttendanceRecord,
  Entry,
  MonthlyBill,
  Product,
  SalaryCalculation,
  ScheduledDelivery,
  StaffMember,
} from "../api";
import { householdMonthKey } from "../lib/formatters";
import { LoadingState } from "../components/feedback/LoadingState";
import { MobileExpensesWorkspace } from "./expenses/MobileExpensesWorkspace";
import { RecurringExpensesPanel } from "./expenses/RecurringExpensesPanel";
import { ProductsWorkspace } from "./products/ProductsWorkspace";
import { DeliveriesWorkspace } from "./deliveries/DeliveriesWorkspace";
import { MonthlyBillsWorkspace } from "./bills/MonthlyBillsWorkspace";
import { StaffWorkspace } from "./staff/StaffWorkspace";
import { SalaryWorkspace } from "./staff/SalaryWorkspace";
import { MonthlyReport } from "./reports/MonthlyReport";
import { StatusFilter } from "./reports/MonthlyReport";
import { SettingsWorkspace } from "./settings/SettingsWorkspace";
import { EntryTable } from "./entries/EntryTable";
import { featureLimitations } from "./dashboard/DashboardWidgets";
import { OverviewWorkspace } from "./dashboard/OverviewWorkspace";
import { Section } from "../app/sectionConfig";

export function WorkspaceContent(props: {
  active: Section;
  user: string;
  userEmail: string;
  householdId: string;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  spend: number;
  overviewLoading: boolean;
  overviewBill: MonthlyBill | null;
  overviewSalaries: SalaryCalculation[];
  todayDeliveries: ScheduledDelivery[];
  attendanceRecords: AttendanceRecord[];
  staff: StaffMember[];
  products: Product[];
  productCreateRequested: boolean;
  overviewError: string;
  onRetryOverview: () => void;
  entries: Entry[];
  filtered: Entry[];
  reportEntries: Entry[];
  entriesLoading: boolean;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onNavigate: (section: Section) => void;
  onSignOut: () => void;
  onStartAdd: (section?: Section) => void;
  onRequestProductCreate: () => void;
  onProductCreateHandled: () => void;
  onMarkPaid: (entry: Entry) => void;
  onOpenEntry: (entry: Entry) => void;
  onRemoveEntry: (entry: Entry) => void;
  onReloadEntries: () => Promise<void>;
  showAllActivity: boolean;
  setShowAllActivity: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    active,
    user,
    userEmail,
    householdId,
    selectedMonth,
    setSelectedMonth,
    spend,
    overviewLoading,
    overviewBill,
    overviewSalaries,
    todayDeliveries,
    attendanceRecords,
    staff,
    products,
    productCreateRequested,
    overviewError,
    onRetryOverview,
    entries,
    filtered,
    reportEntries,
    entriesLoading,
    statusFilter,
    onStatusChange,
    onNavigate,
    onSignOut,
    onStartAdd,
    onRequestProductCreate,
    onProductCreateHandled,
    onMarkPaid,
    onOpenEntry,
    onRemoveEntry,
    onReloadEntries,
    showAllActivity,
    setShowAllActivity,
  } = props;
  return (
    <>
      {active === "More" ? (
        <section className="mobile-more-screen" aria-label="More sections">
          {[
            {
              name: "Salary Management" as Section,
              title: "Salary management",
              description: "Attendance-based salary estimates",
              icon: "₹",
            },
            {
              name: "Products & Rates" as Section,
              title: "Products & rates",
              description: "View household products and delivery schedules",
              icon: "▤",
            },
            {
              name: "Household Expenses" as Section,
              title: "Household expenses",
              description: "Review and add manual expenses",
              icon: "↗",
            },
            {
              name: "Reports" as Section,
              title: "Reports",
              description: "Monthly activity, status filters, and outflow",
              icon: "▥",
            },
            {
              name: "Settings" as Section,
              title: "Settings",
              description: "Account details and available preferences",
              icon: "⚙",
            },
          ].map((item) => (
            <button
              className="mobile-more-card"
              key={item.name}
              onClick={() => onNavigate(item.name)}
            >
              <span className="mobile-more-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mobile-more-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="mobile-more-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          <section className="panel mobile-more-account">
            <small>SIGNED IN AS</small>
            <strong>{user}</strong>
            <span>{userEmail}</span>
          </section>
          <button
            className="mobile-more-signout"
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        </section>
      ) : active === "Overview" ? (
        <OverviewWorkspace
          selectedMonth={selectedMonth}
          spend={spend}
          overviewLoading={overviewLoading}
          overviewBill={overviewBill}
          overviewSalaries={overviewSalaries}
          todayDeliveries={todayDeliveries}
          attendanceRecords={attendanceRecords}
          staff={staff}
          overviewError={overviewError}
          onRetryOverview={onRetryOverview}
          entries={entries}
          filtered={filtered}
          entriesLoading={entriesLoading}
          onNavigate={onNavigate}
          onMarkPaid={onMarkPaid}
          showAllActivity={showAllActivity}
          setShowAllActivity={setShowAllActivity}
          onOpenEntry={onOpenEntry}
          onRemoveEntry={onRemoveEntry}
          onReloadEntries={onReloadEntries}
        />
      ) : active === "Reports" ? (
        <MonthlyReport
          entries={reportEntries}
          month={selectedMonth}
          loading={entriesLoading}
          statusFilter={statusFilter}
          onStatusChange={onStatusChange}
          onView={onNavigate}
          edit={onOpenEntry}
          remove={onRemoveEntry}
        />
      ) : active === "Settings" ? (
        <SettingsWorkspace
          user={user}
          email={userEmail}
          householdId={householdId}
          onSignOut={() => void onSignOut()}
        />
      ) : active === "Products & Rates" ? (
        <ProductsWorkspace
          products={products}
          legacyEntries={entries.filter((entry) => entry.type === "product")}
          loading={entriesLoading}
          onReload={onReloadEntries}
          createRequested={productCreateRequested}
          onCreateHandled={() => onProductCreateHandled()}
        />
      ) : active === "Deliveries" ? (
        <DeliveriesWorkspace
          month={selectedMonth}
          products={products}
          legacyEntries={entries.filter((entry) => entry.type === "delivery")}
          onMonthChange={setSelectedMonth}
          onAddProduct={onRequestProductCreate}
        />
      ) : active === "Monthly Bills" ? (
        <MonthlyBillsWorkspace
          month={selectedMonth}
          legacyEntries={entries.filter(
            (entry) =>
              entry.type === "bill" &&
              householdMonthKey(entry.date) === selectedMonth,
          )}
        />
      ) : active === "Staff & Attendance" ? (
        <StaffWorkspace
          staff={staff}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          onReload={onReloadEntries}
          onOpenSalary={() => onNavigate("Salary Management")}
        />
      ) : active === "Salary Management" ? (
        <SalaryWorkspace
          staff={staff}
          month={selectedMonth}
          legacyEntries={entries.filter(
            (entry) =>
              entry.type === "salary" &&
              householdMonthKey(entry.date) === selectedMonth,
          )}
          onMonthChange={setSelectedMonth}
          onOpenAttendance={() => onNavigate("Staff & Attendance")}
        />
      ) : (
        <>
          {active === "Household Expenses" && <RecurringExpensesPanel month={selectedMonth} onReload={onReloadEntries} />}
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
                  onClick={() => onStartAdd()}
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
                onChange={onStatusChange}
                count={filtered.length}
              />
              {entriesLoading ? (
                <LoadingState label={`Loading ${active.toLowerCase()}…`} />
              ) : (
                <EntryTable
                  entries={filtered}
                  edit={onOpenEntry}
                  remove={onRemoveEntry}
                />
              )}
            </section>
          </div>
          <MobileExpensesWorkspace />
        </>
      )}
    </>
  );
}
