import { useEffect, useState } from "react";
import {
  api,
  MonthlyBill,
  SalaryCalculation,
  ScheduledDelivery,
  SessionExpiredError,
} from "../api";
import { householdDateKey, householdMonthKey } from "../lib/formatters";

export function useOverviewData({
  user,
  month,
  onSessionExpired,
}: {
  user: string;
  month: string;
  onSessionExpired: (message: string) => void;
}) {
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [salaries, setSalaries] = useState<SalaryCalculation[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState<ScheduledDelivery[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setBill(null);
    setSalaries([]);
    const today = householdDateKey(new Date());

    Promise.all([api.prepareBill(month), api.salaries(month)])
      .then(async ([nextBill, salaryResult]) => {
        const todayResult =
          month === householdMonthKey(new Date())
            ? { items: await api.scheduledDeliveries(today, today) }
            : await api.generateScheduledDeliveries(today, today);
        if (cancelled) return;
        setBill(nextBill);
        setSalaries(salaryResult.statements);
        setTodayDeliveries(todayResult.items);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load overview data",
        );
        if (reason instanceof SessionExpiredError)
          onSessionExpired(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, month, reloadKey, onSessionExpired]);

  return {
    bill,
    salaries,
    todayDeliveries,
    loading,
    error,
    reload: () => setReloadKey((value) => value + 1),
  };
}
