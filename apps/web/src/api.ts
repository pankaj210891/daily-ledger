import type {
  AttendanceStatus,
  ScheduleFrequency,
  TimeSlot,
} from "@daily-ledger/shared";
export type {
  AttendanceStatus,
  ScheduleFrequency,
  TimeSlot,
} from "@daily-ledger/shared";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
function apiBase() {
  const value =
    configuredApiUrl ||
    (import.meta.env.DEV
      ? `http://${window.location.hostname || "localhost"}:4000/api/v1`
      : "");
  if (!value)
    throw new Error(
      "Set VITE_API_URL to the HTTPS URL of the Daily Ledger API before building for production.",
    );
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("VITE_API_URL must be a valid absolute URL.");
  }
  if (import.meta.env.PROD && parsed.protocol !== "https:")
    throw new Error("VITE_API_URL must use HTTPS in production.");
  return value.replace(/\/$/, "");
}
const LEGACY_TOKEN_KEY = "daily-ledger-access-token";
const SESSION_MARKER_KEY = "daily-ledger-session-present";
let accessToken: string | null = null;
try {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
} catch {
  /* Storage may be unavailable; access tokens remain memory-only. */
}
export const getToken = () => accessToken;
export const setToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    try {
      sessionStorage.setItem(SESSION_MARKER_KEY, "1");
    } catch {
      /* Marker is optional. */
    }
  }
};
export const hadSession = () => {
  try {
    return sessionStorage.getItem(SESSION_MARKER_KEY) === "1";
  } catch {
    return false;
  }
};
export const clearSessionMarker = () => {
  try {
    sessionStorage.removeItem(SESSION_MARKER_KEY);
  } catch {
    /* Marker is optional. */
  }
};
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Sign in again.");
    this.name = "SessionExpiredError";
  }
}

export interface Entry {
  _id: string;
  type: string;
  name: string;
  category: string;
  amount: number;
  quantity: number;
  unit: string;
  date: string;
  dueDate?: string;
  status: string;
  notes: string;
}
export interface EntryInput {
  type: string;
  name: string;
  category?: string;
  amount?: number;
  quantity?: number;
  unit?: string;
  date?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}
export interface ProductSchedule {
  _id?: string;
  timeSlot: TimeSlot;
  frequency: ScheduleFrequency;
  weekdays: number[];
  everyDays?: number;
  anchorDate?: string;
  startsOn: string;
  endsOn?: string;
  expectedQuantity: number;
}
export interface ProductRate {
  _id: string;
  amount: number;
  effectiveFrom: string;
}
export interface Product {
  _id: string;
  name: string;
  unit: string;
  nameKey: string;
  isActive: boolean;
  rates: ProductRate[];
  schedules: ProductSchedule[];
  currentRate: number | null;
  currentRateEffectiveFrom: string | null;
}
export interface ProductInput {
  name: string;
  unit: string;
  rate: number;
  rateEffectiveFrom?: string;
  schedules: ProductSchedule[];
}
export interface ProductPatch {
  name?: string;
  unit?: string;
  isActive?: boolean;
  schedules?: ProductSchedule[];
}
export interface DeliveryPart {
  _id: string;
  quantity: number;
  actualDate: string;
  notes: string;
}
export interface ScheduledDelivery {
  _id: string;
  productId: string;
  scheduleId: string;
  scheduledDate: string;
  timeSlot: TimeSlot;
  productName: string;
  unit: string;
  expectedQuantity: number;
  deliveredQuantity: number;
  status:
    | "pending"
    | "partially_delivered"
    | "fully_delivered"
    | "cancelled"
    | "skipped"
    | "zero_consumption";
  closeReason: string;
  deliveryRecords: DeliveryPart[];
}
export interface BillLine {
  scheduledDeliveryId: string;
  scheduledDate: string;
  timeSlot: TimeSlot;
  expectedQuantity: number;
  deliveredQuantity: number;
  outstandingQuantity: number;
  closedQuantity: number;
  unit: string;
  rate: number | null;
  rateEffectiveFrom: string | null;
  deliveredAmount: number | null;
  outstandingAmount: number | null;
  status: ScheduledDelivery["status"];
  closeReason: string;
  records: Array<{
    id: string;
    quantity: number;
    actualDate: string;
    notes: string;
  }>;
}
export interface ProductBill {
  productId: string;
  productName: string;
  unit: string;
  expectedQuantity: number;
  deliveredQuantity: number;
  outstandingQuantity: number;
  closedQuantity: number;
  deliveredAmount: number;
  outstandingAmount: number;
  unpricedLines: number;
  lines: BillLine[];
}
export interface MonthlyBill {
  month: string;
  from: string;
  to: string;
  products: ProductBill[];
  totals: {
    scheduledCount: number;
    deliveredQuantityByProduct: Array<{
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
    }>;
    outstandingQuantityByProduct: Array<{
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
    }>;
    closedQuantityByProduct: Array<{
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
    }>;
    totalAmount: number;
    totalOutstandingEstimate: number;
    unpricedLines: number;
  };
}
export interface StaffSalaryRevision {
  _id: string;
  amount: number;
  effectiveFrom: string;
}
export interface StaffMember {
  _id: string;
  name: string;
  joinDate: string;
  endDate?: string | null;
  isActive: boolean;
  weeklyOffDays: number[];
  weeklyOffPaid: boolean;
  weeklyOffHistory: Array<{
    _id: string;
    days: number[];
    paid: boolean;
    effectiveFrom: string;
  }>;
  salaryHistory: StaffSalaryRevision[];
  currentMonthlySalary: number | null;
  currentSalaryEffectiveFrom: string | null;
}
export interface AttendanceRecord {
  _id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  reason: string;
}
export interface HouseholdHoliday {
  _id: string;
  date: string;
  name: string;
}
export interface SalaryDay {
  date: string;
  weekday: string;
  status: AttendanceStatus | "pending";
  source: string;
  monthlySalary: number;
  dailyRate: number;
  deduction: number;
  reason: string;
}
export interface SalaryCounts {
  present: number;
  absent: number;
  pto: number;
  lop: number;
  weeklyOff: number;
  paidWeeklyOff: number;
  unpaidWeeklyOff: number;
  holiday: number;
  unmarkedPresentDays: number;
  pendingAttendance: number;
}
export interface SalaryTransaction {
  _id: string;
  kind: "advance" | "payment" | "adjustment";
  amount: number;
  date: string;
  note: string;
  reason: string;
}
export interface SalaryCalculation {
  staffId: string;
  staffName: string;
  isActive: boolean;
  month: string;
  joinDate: string;
  endDate: string | null;
  weeklyOffDays: number[];
  weeklyOffPaid: boolean;
  salaryRateHistory: Array<{ effectiveFrom: string; monthlySalary: number }>;
  weeklyOffPolicyHistory: Array<{
    effectiveFrom: string;
    days: number[];
    paid: boolean;
  }>;
  daysInMonth: number;
  employedDays: number;
  grossSalary: number;
  deductions: number;
  netPayable: number;
  counts: SalaryCounts;
  dailyBreakdown: SalaryDay[];
  finalized: boolean;
  finalizedAt: string | null;
  transactions: SalaryTransaction[];
  advances: number;
  payments: number;
  adjustments: number;
  amountDue: number;
  paymentStatus: "pending" | "partially_paid" | "paid";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBase();
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error(
      `Can't reach the API at ${base}. Start the API server and check its MongoDB connection.`,
    );
  }
  const refreshable = ![
    "/auth/signin",
    "/auth/signup",
    "/auth/refresh",
    "/auth/signout",
  ].includes(path);
  if (response.status === 401 && refreshable) {
    const refreshed = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    if (refreshed?.ok) {
      const body = await refreshed.json();
      setToken(body.data.accessToken);
      headers.set("Authorization", `Bearer ${body.data.accessToken}`);
      response = await fetch(`${base}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
    } else if (refreshed?.status === 401) {
      setToken(null);
      throw new SessionExpiredError();
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message || `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const api = {
  entries: async () => (await request<{ data: Entry[] }>("/entries")).data,
  createEntry: async (entry: EntryInput) =>
    (
      await request<{ data: Entry }>("/entries", {
        method: "POST",
        body: JSON.stringify(entry),
      })
    ).data,
  updateEntry: async (id: string, patch: Partial<EntryInput>) =>
    (
      await request<{ data: Entry }>(`/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).data,
  deleteEntry: (id: string) =>
    request<void>(`/entries/${id}`, { method: "DELETE" }),
  auth: async (mode: "signup" | "signin", input: Record<string, string>) =>
    request<{
      data: {
        accessToken: string;
        user: { name: string; email: string; householdId: string };
      };
    }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(input) }),
  requestPasswordReset: (email: string) =>
    request<{ data: { message: string } }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ data: { message: string } }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  products: async () => (await request<{ data: Product[] }>("/products")).data,
  staff: async () => (await request<{ data: StaffMember[] }>("/staff")).data,
  createStaff: async (input: {
    name: string;
    joinDate: string;
    monthlySalary: number;
    weeklyOffDays: number[];
    weeklyOffPaid: boolean;
  }) =>
    (
      await request<{ data: StaffMember }>("/staff", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  updateStaff: async (
    id: string,
    patch: {
      name?: string;
      joinDate?: string;
      endDate?: string | null;
      isActive?: boolean;
      weeklyOffDays?: number[];
      weeklyOffPaid?: boolean;
    },
  ) =>
    (
      await request<{ data: StaffMember }>(`/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).data,
  addSalaryRevision: async (
    id: string,
    amount: number,
    effectiveFrom: string,
  ) =>
    (
      await request<{ data: StaffMember }>(`/staff/${id}/salary-revisions`, {
        method: "POST",
        body: JSON.stringify({ amount, effectiveFrom }),
      })
    ).data,
  attendance: async (month: string, staffId?: string) =>
    (
      await request<{ data: AttendanceRecord[] }>(
        `/attendance?month=${encodeURIComponent(month)}${staffId ? `&staffId=${encodeURIComponent(staffId)}` : ""}`,
      )
    ).data,
  saveAttendance: async (input: {
    staffId: string;
    date: string;
    status: AttendanceStatus;
    reason?: string;
  }) =>
    (
      await request<{ data: AttendanceRecord }>("/attendance", {
        method: "PUT",
        body: JSON.stringify(input),
      })
    ).data,
  deleteAttendance: (id: string) =>
    request<void>(`/attendance/${id}`, { method: "DELETE" }),
  holidays: async (month: string) =>
    (
      await request<{ data: HouseholdHoliday[] }>(
        `/holidays?month=${encodeURIComponent(month)}`,
      )
    ).data,
  saveHoliday: async (input: { date: string; name: string }) =>
    (
      await request<{ data: HouseholdHoliday }>("/holidays", {
        method: "PUT",
        body: JSON.stringify(input),
      })
    ).data,
  deleteHoliday: (id: string) =>
    request<void>(`/holidays/${id}`, { method: "DELETE" }),
  salaries: async (month: string) =>
    (
      await request<{
        data: {
          month: string;
          daysInMonth: number;
          statements: SalaryCalculation[];
        };
      }>(`/salaries?month=${encodeURIComponent(month)}`)
    ).data,
  finalizeSalary: async (staffId: string, month: string) =>
    (
      await request<{ data: SalaryCalculation }>(
        `/salaries/${staffId}/finalize`,
        { method: "POST", body: JSON.stringify({ month }) },
      )
    ).data,
  addSalaryTransaction: async (
    staffId: string,
    input: {
      month: string;
      kind: "advance" | "payment" | "adjustment";
      amount: number;
      date: string;
      note?: string;
      reason?: string;
    },
  ) =>
    (
      await request<{ data: SalaryCalculation }>(
        `/salaries/${staffId}/transactions`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  createProduct: async (product: ProductInput) =>
    (
      await request<{ data: Product }>("/products", {
        method: "POST",
        body: JSON.stringify(product),
      })
    ).data,
  updateProduct: async (id: string, patch: ProductPatch) =>
    (
      await request<{ data: Product }>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).data,
  addProductRate: async (id: string, amount: number, effectiveFrom: string) =>
    (
      await request<{ data: Product }>(`/products/${id}/rates`, {
        method: "POST",
        body: JSON.stringify({ amount, effectiveFrom }),
      })
    ).data,
  generateScheduledDeliveries: async (from: string, to: string) =>
    (
      await request<{ data: { items: ScheduledDelivery[]; count: number } }>(
        "/scheduled-deliveries/generate",
        { method: "POST", body: JSON.stringify({ from, to }) },
      )
    ).data,
  scheduledDeliveries: async (from: string, to: string) =>
    (
      await request<{ data: ScheduledDelivery[] }>(
        `/scheduled-deliveries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
    ).data,
  addDeliveryPart: async (
    id: string,
    input: { quantity: number; actualDate: string; notes?: string },
  ) =>
    (
      await request<{ data: ScheduledDelivery }>(
        `/scheduled-deliveries/${id}/deliveries`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  updateDeliveryPart: async (
    id: string,
    recordId: string,
    patch: { quantity?: number; actualDate?: string; notes?: string },
  ) =>
    (
      await request<{ data: ScheduledDelivery }>(
        `/scheduled-deliveries/${id}/deliveries/${recordId}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      )
    ).data,
  deleteDeliveryPart: (id: string, recordId: string) =>
    request<{ data: ScheduledDelivery }>(
      `/scheduled-deliveries/${id}/deliveries/${recordId}`,
      { method: "DELETE" },
    ),
  closeScheduledDelivery: async (
    id: string,
    action: "zero-consumption" | "skip" | "cancel",
    reason?: string,
  ) =>
    (
      await request<{ data: ScheduledDelivery }>(
        `/scheduled-deliveries/${id}/${action}`,
        { method: "POST", body: JSON.stringify({ reason }) },
      )
    ).data,
  prepareBill: async (month: string) =>
    (
      await request<{ data: MonthlyBill }>("/bills/prepare", {
        method: "POST",
        body: JSON.stringify({ month }),
      })
    ).data,
  bill: async (month: string) =>
    (
      await request<{ data: MonthlyBill }>(
        `/bills?month=${encodeURIComponent(month)}`,
      )
    ).data,
  refresh: () =>
    request<{ data: { accessToken: string } }>("/auth/refresh", {
      method: "POST",
    }),
  me: () =>
    request<{ data: { name: string; email: string; householdId: string } }>(
      "/auth/me",
    ),
  signout: () => request<void>("/auth/signout", { method: "POST" }),
};
