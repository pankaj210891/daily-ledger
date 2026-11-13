import { Entry } from "./api";
import { money } from "./lib/formatters";
import { LoadingState } from "./components/feedback/LoadingState";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { AppNavigation } from "./components/layout/AppNavigation";
import { AppTopBar, PageControls } from "./components/layout/AppPageHeader";
import { AuthScreen } from "./features/auth/AuthScreen";
import { EntryForm } from "./features/entries/EntryForm";
import { WorkspaceContent } from "./features/WorkspaceContent";
import { Section } from "./app/sectionConfig";
import { useLedgerApp } from "./app/useLedgerApp";

function App() {
  const {
    active,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    entries,
    products,
    staff,
    attendanceRecords,
    overviewBill,
    overviewSalaries,
    todayDeliveries,
    overviewLoading,
    overviewError,
    reloadOverview,
    productCreateRequested,
    setProductCreateRequested,
    user,
    authenticate,
    userEmail,
    householdId,
    loading,
    entriesLoading,
    error,
    authNotice,
    setAuthNotice,
    formOpen,
    setFormOpen,
    formType,
    payingEntry,
    setPayingEntry,
    paymentBusy,
    paymentError,
    setPaymentError,
    toast,
    headerMenu,
    setHeaderMenu,
    showAllActivity,
    setShowAllActivity,
    selectedMonth,
    setSelectedMonth,
    editing,
    setEditing,
    quickAddOpen,
    setQuickAddOpen,
    setActive,
    notify,
    load,
    startAdd,
    requestProductCreate,
    openEntry,
    signOut,
    markPaid,
    confirmMarkPaid,
    saveEntry,
    remove,
    filtered,
    monthEntries,
    spend,
    reportEntries,
    notifications,
  } = useLedgerApp();
  if (loading)
    return (
      <main className="auth-screen">
        <LoadingState label="Connecting to your household ledger…" />
      </main>
    );
  if (!user) return <AuthScreen notice={authNotice} onAuth={authenticate} />;
  return (
    <div className="app-shell">
      <AppNavigation
        active={active}
        user={user}
        onNavigate={setActive}
        onSignOut={() => void signOut()}
      />
      <main className="main-area">
        <AppTopBar
          active={active}
          user={user}
          userEmail={userEmail}
          entries={entries}
          notifications={notifications}
          search={search}
          setSearch={setSearch}
          headerMenu={headerMenu}
          setHeaderMenu={setHeaderMenu}
          onSignOut={() => void signOut()}
          quickAddOpen={quickAddOpen}
          setQuickAddOpen={setQuickAddOpen}
          onNavigate={setActive}
          onStartAdd={startAdd}
          onRequestProductCreate={requestProductCreate}
          onOpenEntry={openEntry}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          error={error}
          onRetry={() => void load()}
        />
        <div className="page-content">
          <PageControls
            active={active}
            user={user}
            userEmail={userEmail}
            entries={entries}
            notifications={notifications}
            search={search}
            setSearch={setSearch}
            headerMenu={headerMenu}
            setHeaderMenu={setHeaderMenu}
            onSignOut={() => void signOut()}
            quickAddOpen={quickAddOpen}
            setQuickAddOpen={setQuickAddOpen}
            onNavigate={setActive}
            onStartAdd={startAdd}
            onRequestProductCreate={requestProductCreate}
            onOpenEntry={openEntry}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            error={error}
            onRetry={() => void load()}
          />
          <WorkspaceContent
            active={active}
            user={user}
            userEmail={userEmail}
            householdId={householdId}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            spend={spend}
            overviewLoading={overviewLoading}
            overviewBill={overviewBill}
            overviewSalaries={overviewSalaries}
            todayDeliveries={todayDeliveries}
            attendanceRecords={attendanceRecords}
            staff={staff}
            products={products}
            productCreateRequested={productCreateRequested}
            overviewError={overviewError}
            onRetryOverview={reloadOverview}
            entries={entries}
            filtered={filtered}
            reportEntries={reportEntries}
            entriesLoading={entriesLoading}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onNavigate={setActive}
            onSignOut={() => void signOut()}
            onStartAdd={(section) => startAdd(section)}
            onRequestProductCreate={requestProductCreate}
            onProductCreateHandled={() => setProductCreateRequested(false)}
            onMarkPaid={markPaid}
            onOpenEntry={openEntry}
            onRemoveEntry={remove}
            onReloadEntries={load}
            showAllActivity={showAllActivity}
            setShowAllActivity={setShowAllActivity}
          />
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

export default App;
