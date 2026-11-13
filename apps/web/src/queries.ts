import { createLedgerQueries } from "@daily-ledger/data";
import { householdMonthKey } from "@daily-ledger/shared";
import { api } from "./api";

export const ledgerQueries = createLedgerQueries({
  ...api,
  salaries: async (month: string) => (await api.salaries(month)).statements,
  dayDeliveries: async (date: string) => {
    const isCurrentMonth = date.slice(0, 7) === householdMonthKey(new Date());
    if (isCurrentMonth) return api.scheduledDeliveries(date, date);
    return (await api.generateScheduledDeliveries(date, date)).items;
  },
});
