import { useEffect } from "react";
import { SessionExpiredError } from "../api";
import { householdDateKey } from "../lib/formatters";
import { ledgerQueries } from "../queries";

export function useOverviewData({
  user,
  month,
  onSessionExpired,
}: {
  user: string;
  month: string;
  onSessionExpired: (message: string) => void;
}) {
  const enabled = Boolean(user);
  const billQuery = ledgerQueries.useBill(month, enabled);
  const salaryQuery = ledgerQueries.useSalaries(month, enabled);
  const todayDeliveriesQuery = ledgerQueries.useDayDeliveries(
    householdDateKey(new Date()),
    enabled,
  );
  const issue = [
    billQuery.error,
    salaryQuery.error,
    todayDeliveriesQuery.error,
  ].find(Boolean);

  useEffect(() => {
    if (issue instanceof SessionExpiredError) onSessionExpired(issue.message);
  }, [issue, onSessionExpired]);

  return {
    bill: billQuery.data ?? null,
    salaries: salaryQuery.data ?? [],
    todayDeliveries: todayDeliveriesQuery.data ?? [],
    loading:
      enabled &&
      [billQuery, salaryQuery, todayDeliveriesQuery].some(
        (query) => query.isLoading,
      ),
    error: issue instanceof Error ? issue.message : "",
    reload: () => {
      void Promise.all([
        billQuery.refetch(),
        salaryQuery.refetch(),
        todayDeliveriesQuery.refetch(),
      ]);
    },
  };
}
