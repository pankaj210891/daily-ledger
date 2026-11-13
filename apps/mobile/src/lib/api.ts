import * as SecureStore from "expo-secure-store";
import type {
  AttendanceStatus,
  ScheduleFrequency,
  TimeSlot,
} from "@daily-ledger/shared";
export type { AttendanceStatus } from "@daily-ledger/shared";

const apiBase =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
const refreshKey = "daily-ledger-mobile-refresh";
let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session expired. Sign in again.");
    this.name = "SessionExpiredError";
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  householdId: string;
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
export type ProductTimeSlot = TimeSlot;
export type ProductScheduleFrequency = ScheduleFrequency;
export interface ProductSchedule {
  _id?: string;
  timeSlot: ProductTimeSlot;
  frequency: ProductScheduleFrequency;
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
  isActive: boolean;
  rates: ProductRate[];
  currentRate: number | null;
  currentRateEffectiveFrom: string | null;
  schedules: ProductSchedule[];
}
export interface ScheduledDelivery {
  _id: string;
  productId: string;
  scheduledDate: string;
  timeSlot: string;
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
  deliveryRecords: {
    _id: string;
    quantity: number;
    actualDate: string;
    notes: string;
  }[];
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
  lines: {
    scheduledDeliveryId: string;
    scheduledDate: string;
    timeSlot: string;
    expectedQuantity: number;
    deliveredQuantity: number;
    outstandingQuantity: number;
    unit: string;
    rate: number | null;
    deliveredAmount: number | null;
    outstandingAmount: number | null;
    status: ScheduledDelivery["status"];
  }[];
}
export interface MonthlyBill {
  month: string;
  products: ProductBill[];
  totals: {
    scheduledCount: number;
    totalAmount: number;
    totalOutstandingEstimate: number;
    unpricedLines: number;
  };
}
export interface StaffMember {
  _id: string;
  name: string;
  joinDate: string;
  endDate?: string | null;
  isActive: boolean;
  weeklyOffDays: number[];
  weeklyOffPaid: boolean;
  weeklyOffHistory: {
    _id: string;
    days: number[];
    paid: boolean;
    effectiveFrom: string;
  }[];
  salaryHistory: { _id: string; amount: number; effectiveFrom: string }[];
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
export interface SalaryCalculation {
  staffId: string;
  staffName: string;
  netPayable: number;
  grossSalary: number;
  deductions: number;
  counts: {
    present: number;
    absent: number;
    pto: number;
    lop: number;
    weeklyOff: number;
    holiday: number;
    pendingAttendance: number;
  };
  dailyBreakdown: {
    date: string;
    status: string;
    source: string;
    deduction: number;
    reason: string;
  }[];
}
type Response<T> = { data: T };

function baseUrl() {
  if (!apiBase)
    throw new Error(
      "Set EXPO_PUBLIC_API_URL in apps/mobile/.env to your API address. For iPhone testing on Wi-Fi, use your Mac's local network IP and port 4000.",
    );
  return apiBase;
}
async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(
      `Can't reach the API at ${apiBase}. Check that the API is running and reachable from this iPhone.`,
    );
  }
  const publicAuth =
    path.startsWith("/auth/mobile/") ||
    ["/auth/forgot-password", "/auth/reset-password"].includes(path);
  if (response.status === 401 && !publicAuth && (await rotateRefreshToken())) {
    try {
      response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new Error(
        `Can't reach the API at ${apiBase}. Check that the API is running and reachable from this iPhone.`,
      );
    }
  } else if (response.status === 401 && !publicAuth) {
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message || `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
async function rotateRefreshToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    refreshToken ||= await SecureStore.getItemAsync(refreshKey);
    if (!refreshToken) return false;
    let response: globalThis.Response;
    try {
      response = await fetch(`${baseUrl()}/auth/mobile/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      return false;
    }
    if (!response.ok) {
      if (response.status === 401) await clearSession();
      return false;
    }
    const { data } = (await response.json()) as Response<{
      accessToken: string;
      refreshToken: string;
    }>;
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    await SecureStore.setItemAsync(refreshKey, refreshToken);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}
async function saveSession(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await SecureStore.setItemAsync(refreshKey, tokens.refreshToken);
}
async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(refreshKey);
}

export const api = {
  initializeSession: async (): Promise<User | null> => {
    refreshToken = await SecureStore.getItemAsync(refreshKey);
    if (!refreshToken || !(await rotateRefreshToken())) return null;
    try {
      return (await fetchJson<Response<User>>("/auth/me")).data;
    } catch (error) {
      if (error instanceof SessionExpiredError) await clearSession();
      throw error;
    }
  },
  signIn: async (email: string, password: string) => {
    const result = await fetchJson<
      Response<{ accessToken: string; refreshToken: string; user: User }>
    >("/auth/mobile/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await saveSession(result.data);
    return result.data.user;
  },
  signUp: async (
    name: string,
    email: string,
    password: string,
    householdName?: string,
  ) => {
    const result = await fetchJson<
      Response<{ accessToken: string; refreshToken: string; user: User }>
    >("/auth/mobile/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, householdName }),
    });
    await saveSession(result.data);
    return result.data.user;
  },
  signOut: async () => {
    const token = refreshToken || (await SecureStore.getItemAsync(refreshKey));
    try {
      if (token)
        await fetchJson<void>("/auth/mobile/signout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: token }),
        });
    } finally {
      await clearSession();
    }
  },
  forgotPassword: async (email: string) =>
    (
      await fetchJson<Response<{ message: string }>>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
    ).data,
  me: async () => (await fetchJson<Response<User>>("/auth/me")).data,
  entries: async () => (await fetchJson<Response<Entry[]>>("/entries")).data,
  createEntry: async (entry: {
    type: string;
    name: string;
    category?: string;
    amount: number;
    date: string;
    status?: string;
    notes?: string;
  }) =>
    (
      await fetchJson<Response<Entry>>("/entries", {
        method: "POST",
        body: JSON.stringify(entry),
      })
    ).data,
  updateEntry: async (
    id: string,
    input: {
      name?: string;
      category?: string;
      amount?: number;
      date?: string;
      status?: string;
      notes?: string;
    },
  ) =>
    (
      await fetchJson<Response<Entry>>(`/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      })
    ).data,
  deleteEntry: async (id: string) =>
    fetchJson<void>(`/entries/${id}`, { method: "DELETE" }),
  products: async () =>
    (await fetchJson<Response<Product[]>>("/products")).data,
  createProduct: async (input: {
    name: string;
    unit: string;
    rate: number;
    rateEffectiveFrom: string;
    schedules: ProductSchedule[];
  }) =>
    (
      await fetchJson<Response<Product>>("/products", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  updateProduct: async (
    id: string,
    input: {
      name?: string;
      unit?: string;
      isActive?: boolean;
      schedules?: ProductSchedule[];
    },
  ) =>
    (
      await fetchJson<Response<Product>>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      })
    ).data,
  addProductRate: async (
    id: string,
    input: { amount: number; effectiveFrom: string },
  ) =>
    (
      await fetchJson<Response<Product>>(`/products/${id}/rates`, {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  staff: async () => (await fetchJson<Response<StaffMember[]>>("/staff")).data,
  createStaff: async (input: {
    name: string;
    joinDate: string;
    monthlySalary: number;
    weeklyOffDays: number[];
    weeklyOffPaid: boolean;
  }) =>
    (
      await fetchJson<Response<StaffMember>>("/staff", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  attendance: async (month: string, staffId?: string) =>
    (
      await fetchJson<Response<AttendanceRecord[]>>(
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
      await fetchJson<Response<AttendanceRecord>>("/attendance", {
        method: "PUT",
        body: JSON.stringify(input),
      })
    ).data,
  deleteAttendance: async (id: string) =>
    fetchJson<void>(`/attendance/${id}`, { method: "DELETE" }),
  updateStaff: async (
    id: string,
    input: {
      name?: string;
      joinDate?: string;
      endDate?: string | null;
      isActive?: boolean;
      weeklyOffDays?: number[];
      weeklyOffPaid?: boolean;
    },
  ) =>
    (
      await fetchJson<Response<StaffMember>>(`/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      })
    ).data,
  addSalaryRevision: async (
    id: string,
    input: { amount: number; effectiveFrom: string },
  ) =>
    (
      await fetchJson<Response<StaffMember>>(`/staff/${id}/salary-revisions`, {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  holidays: async (month: string) =>
    (
      await fetchJson<Response<HouseholdHoliday[]>>(
        `/holidays?month=${encodeURIComponent(month)}`,
      )
    ).data,
  saveHoliday: async (input: { date: string; name: string }) =>
    (
      await fetchJson<Response<HouseholdHoliday>>("/holidays", {
        method: "PUT",
        body: JSON.stringify(input),
      })
    ).data,
  deleteHoliday: async (id: string) =>
    fetchJson<void>(`/holidays/${id}`, { method: "DELETE" }),
  salaries: async (month: string) =>
    (
      await fetchJson<Response<{ statements: SalaryCalculation[] }>>(
        `/salaries?month=${encodeURIComponent(month)}`,
      )
    ).data.statements,
  generateDeliveries: async (from: string, to: string) =>
    (
      await fetchJson<Response<{ items: ScheduledDelivery[]; count: number }>>(
        "/scheduled-deliveries/generate",
        { method: "POST", body: JSON.stringify({ from, to }) },
      )
    ).data.items,
  deliveries: async (from: string, to: string) =>
    (
      await fetchJson<Response<ScheduledDelivery[]>>(
        `/scheduled-deliveries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
    ).data,
  addDeliveryPart: async (
    id: string,
    input: { quantity: number; actualDate: string; notes?: string },
  ) =>
    (
      await fetchJson<Response<ScheduledDelivery>>(
        `/scheduled-deliveries/${id}/deliveries`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  updateDeliveryPart: async (
    id: string,
    recordId: string,
    input: { quantity?: number; actualDate?: string; notes?: string },
  ) =>
    (
      await fetchJson<Response<ScheduledDelivery>>(
        "/scheduled-deliveries/" + id + "/deliveries/" + recordId,
        { method: "PATCH", body: JSON.stringify(input) },
      )
    ).data,
  deleteDeliveryPart: async (id: string, recordId: string) =>
    (
      await fetchJson<Response<ScheduledDelivery>>(
        "/scheduled-deliveries/" + id + "/deliveries/" + recordId,
        { method: "DELETE" },
      )
    ).data,
  closeScheduledDelivery: async (
    id: string,
    action: "zero-consumption" | "skip" | "cancel",
    reason: string,
  ) =>
    (
      await fetchJson<Response<ScheduledDelivery>>(
        `/scheduled-deliveries/${id}/${action}`,
        { method: "POST", body: JSON.stringify({ reason }) },
      )
    ).data,
  prepareBill: async (month: string) =>
    (
      await fetchJson<Response<MonthlyBill>>("/bills/prepare", {
        method: "POST",
        body: JSON.stringify({ month }),
      })
    ).data,
};
