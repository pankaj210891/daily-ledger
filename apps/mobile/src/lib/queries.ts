import { createLedgerQueries } from "@daily-ledger/data";
import { api } from "./api";

export const ledgerQueries = createLedgerQueries({
  ...api,
  dayDeliveries: (date: string) => api.deliveries(date, date),
});
