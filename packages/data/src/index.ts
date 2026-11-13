import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";

export const ledgerKeys = {
  all: ["ledger"] as const,
  entries: () => [...ledgerKeys.all, "entries"] as const,
  products: () => [...ledgerKeys.all, "products"] as const,
  staff: () => [...ledgerKeys.all, "staff"] as const,
  attendance: (month: string, staffId?: string) =>
    [...ledgerKeys.all, "attendance", month, staffId ?? null] as const,
  holidays: (month: string) => [...ledgerKeys.all, "holidays", month] as const,
  salaries: (month: string) => [...ledgerKeys.all, "salaries", month] as const,
  deliveries: (from: string, to: string) =>
    [...ledgerKeys.all, "deliveries", from, to] as const,
  bill: (month: string) => [...ledgerKeys.all, "bill", month] as const,
  dayDeliveries: (date: string) =>
    [...ledgerKeys.all, "day-deliveries", date] as const,
};

export function createLedgerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}

export function createLedgerQueries<
  Api extends {
    entries: () => Promise<unknown>;
    products: () => Promise<unknown>;
    staff: () => Promise<unknown>;
    attendance: (month: string, staffId?: string) => Promise<unknown>;
    salaries: (month: string) => Promise<unknown>;
    holidays: (month: string) => Promise<unknown>;
    prepareBill: (month: string) => Promise<unknown>;
    dayDeliveries: (date: string) => Promise<unknown>;
  },
>(api: Api) {
  type Result<Key extends keyof Api> = Api[Key] extends (
    ...args: never[]
  ) => infer Value
    ? Awaited<Value>
    : never;
  return {
    useEntries: (enabled = true) =>
      useQuery<Result<"entries">>({
        queryKey: ledgerKeys.entries(),
        queryFn: async () => (await api.entries()) as Result<"entries">,
        enabled,
      }),
    useProducts: (enabled = true) =>
      useQuery<Result<"products">>({
        queryKey: ledgerKeys.products(),
        queryFn: async () => (await api.products()) as Result<"products">,
        enabled,
      }),
    useStaff: (enabled = true) =>
      useQuery<Result<"staff">>({
        queryKey: ledgerKeys.staff(),
        queryFn: async () => (await api.staff()) as Result<"staff">,
        enabled,
      }),
    useAttendance: (month: string, staffId?: string, enabled = true) =>
      useQuery<Result<"attendance">>({
        queryKey: ledgerKeys.attendance(month, staffId),
        queryFn: async () =>
          (await api.attendance(month, staffId)) as Result<"attendance">,
        enabled,
      }),
    useSalaries: (month: string, enabled = true) =>
      useQuery<Result<"salaries">>({
        queryKey: ledgerKeys.salaries(month),
        queryFn: async () => (await api.salaries(month)) as Result<"salaries">,
        enabled,
      }),
    useHolidays: (month: string, enabled = true) =>
      useQuery<Result<"holidays">>({
        queryKey: ledgerKeys.holidays(month),
        queryFn: async () => (await api.holidays(month)) as Result<"holidays">,
        enabled,
      }),
    useBill: (month: string, enabled = true) =>
      useQuery<Result<"prepareBill">>({
        queryKey: ledgerKeys.bill(month),
        queryFn: async () =>
          (await api.prepareBill(month)) as Result<"prepareBill">,
        enabled,
      }),
    useDayDeliveries: (date: string, enabled = true) =>
      useQuery<Result<"dayDeliveries">>({
        queryKey: ledgerKeys.dayDeliveries(date),
        queryFn: async () =>
          (await api.dayDeliveries(date)) as Result<"dayDeliveries">,
        enabled,
      }),
    useInvalidateLedger: () => {
      const client = useQueryClient();
      return () => client.invalidateQueries({ queryKey: ledgerKeys.all });
    },
    useInvalidateAttendance: () => {
      const client = useQueryClient();
      return (month: string) =>
        Promise.all([
          client.invalidateQueries({ queryKey: ledgerKeys.attendance(month) }),
          client.invalidateQueries({ queryKey: ledgerKeys.salaries(month) }),
        ]);
    },
  };
}
