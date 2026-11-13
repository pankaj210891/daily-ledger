import { FormEvent, useEffect, useMemo, useState } from "react";
import { ledgerQueries } from "../queries";
import { api, Entry, EntryInput, SessionExpiredError } from "../api";
import { householdMonthKey } from "../lib/formatters";
import { useOverviewData } from "./useOverviewData";
import { useSession } from "./useSession";
import {
  Section,
  groups,
  sectionFromPath,
  sectionPath,
  typeFor,
  typesFor,
} from "./sectionConfig";

export function useLedgerApp() {
  const [active, setActiveState] = useState<Section>(() =>
    sectionFromPath(window.location.pathname),
  );
  const [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [productCreateRequested, setProductCreateRequested] = useState(false),
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
  const session = useSession();
  const entriesQuery = ledgerQueries.useEntries(Boolean(session.user));
  const productsQuery = ledgerQueries.useProducts(Boolean(session.user));
  const staffQuery = ledgerQueries.useStaff(Boolean(session.user));
  const currentMonth = householdMonthKey(new Date());
  const attendanceQuery = ledgerQueries.useAttendance(
    currentMonth,
    undefined,
    Boolean(session.user),
  );
  const entries = entriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const attendanceRecords = attendanceQuery.data ?? [];
  const entriesLoading = [
    entriesQuery,
    productsQuery,
    staffQuery,
    attendanceQuery,
  ].some((query) => query.isLoading);
  const invalidateLedger = ledgerQueries.useInvalidateLedger();
  const overview = useOverviewData({
    user: session.user,
    month: selectedMonth,
    onSessionExpired: session.expireSession,
  });
  const setActive = (section: Section) => {
    setActiveState(section);
    const path = sectionPath(section);
    if (window.location.pathname !== path)
      window.history.pushState({}, "", path);
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
    if (window.location.pathname !== canonicalPath)
      window.history.replaceState({}, "", canonicalPath);
  }, [active]);
  useEffect(() => {
    setStatusFilter("all");
  }, [active]);
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 2800);
  };
  useEffect(() => {
    const issue = [
      entriesQuery.error,
      productsQuery.error,
      staffQuery.error,
      attendanceQuery.error,
    ].find(Boolean);
    if (issue instanceof SessionExpiredError)
      session.expireSession(issue.message);
    else if (issue instanceof Error) setError(issue.message);
  }, [
    entriesQuery.error,
    productsQuery.error,
    staffQuery.error,
    attendanceQuery.error,
  ]);
  const load = async () => {
    setError("");
    await invalidateLedger();
  };
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
  return {
    active,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    entries,
    products,
    staff,
    attendanceRecords,
    overviewBill: overview.bill,
    overviewSalaries: overview.salaries,
    todayDeliveries: overview.todayDeliveries,
    overviewLoading: overview.loading,
    overviewError: overview.error,
    reloadOverview: overview.reload,
    productCreateRequested,
    setProductCreateRequested,
    user: session.user,
    userEmail: session.userEmail,
    householdId: session.householdId,
    loading: session.loading,
    entriesLoading,
    error,
    authNotice: session.authNotice,
    setAuthNotice: session.setAuthNotice,
    authenticate: session.authenticate,
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
    signOut: session.signOut,
    markPaid,
    confirmMarkPaid,
    saveEntry,
    remove,
    filtered,
    monthEntries,
    spend,
    reportEntries,
    notifications,
  };
}
