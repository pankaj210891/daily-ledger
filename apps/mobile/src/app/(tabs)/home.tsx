import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/providers/auth";
import { api, type Entry } from "@/lib/api";
import { ledgerQueries } from "@/lib/queries";
import { dateTitle, monthKey, monthTitle, money, todayKey } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { Busy, Card, Message, MonthPicker, Screen } from "@/components/ui";

export default function OverviewScreen() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthKey());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const billQuery = ledgerQueries.useBill(month);
  const salaryQuery = ledgerQueries.useSalaries(month);
  const entriesQuery = ledgerQueries.useEntries();
  const staffQuery = ledgerQueries.useStaff();
  const attendanceQuery = ledgerQueries.useAttendance(month);
  const bill = billQuery.data ?? null;
  const salaries = salaryQuery.data ?? [];
  const entries = entriesQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const loading = [
    billQuery,
    salaryQuery,
    entriesQuery,
    staffQuery,
    attendanceQuery,
  ].some((query) => query.isLoading);
  const queryError = [
    billQuery.error,
    salaryQuery.error,
    entriesQuery.error,
    staffQuery.error,
    attendanceQuery.error,
  ].find(Boolean);
  const invalidateLedger = ledgerQueries.useInvalidateLedger();
  async function load() {
    setError("");
    try {
      await invalidateLedger();
    } finally {
      setRefreshing(false);
    }
  }
  const changeMonth = (value: string) => {
    setError("");
    setMonth(value);
  };
  const ledgerOutflow = entries
    .filter(
      (entry) =>
        entry.date.startsWith(month) &&
        ["expense", "bill", "salary", "delivery"].includes(entry.type) &&
        !["pending", "upcoming"].includes(entry.status),
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openItems =
    bill?.products.reduce(
      (count, product) =>
        count +
        product.lines.filter(
          (line) =>
            line.status === "pending" || line.status === "partially_delivered",
        ).length,
      0,
    ) || 0;
  const today = todayKey();
  const todaysDeliveries =
    bill?.products.flatMap((product) =>
      product.lines
        .filter((line) => line.scheduledDate === today)
        .map((line) => ({ ...line, productName: product.productName })),
    ) || [];
  const activeStaff = staff.filter(
    (member) =>
      member.isActive &&
      member.joinDate <= today &&
      (!member.endDate || member.endDate >= today),
  );
  const presentCount = activeStaff.filter((member) => {
    const record = attendance.find(
      (item) => item.staffId === member._id && item.date === today,
    );
    return !record || record.status === "present";
  }).length;
  const absentCount = attendance.filter(
    (record) =>
      record.date === today &&
      (record.status === "absent" || record.status === "lop"),
  ).length;
  const trend = buildTrend(entries, month);
  const maxTrend = Math.max(1, ...trend.map((item) => item.total));
  const categoryTotals = entries
    .filter(
      (entry) =>
        entry.date.startsWith(month) &&
        ["expense", "bill", "salary", "delivery"].includes(entry.type) &&
        !["pending", "upcoming"].includes(entry.status),
    )
    .reduce<Record<string, number>>((totals, entry) => {
      const category = entry.category || "General";
      totals[category] = (totals[category] || 0) + entry.amount;
      return totals;
    }, {});
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const todayOutflow = trend.at(-1)?.total || 0;
  const upcoming = entries
    .filter(
      (entry) =>
        (entry.type === "bill" || entry.type === "salary") &&
        entry.status !== "paid" &&
        (["pending", "upcoming"].includes(entry.status) ||
          Boolean(entry.dueDate && entry.dueDate.slice(0, 10) >= today)),
    )
    .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date))
    .slice(0, 4);
  async function markPaid(entry: Entry) {
    try {
      await api.updateEntry(entry._id, { status: "paid" });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to mark payment as paid.",
      );
    }
  }
  return (
    <Screen>
      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>DAILY LEDGER</Text>
        <Text style={styles.title}>
          Good day, {user?.name?.split(" ")[0] || "there"}
        </Text>
        <Text style={styles.subtitle}>Your household at a glance.</Text>
      </View>
      <MonthPicker month={month} onChange={changeMonth} />
      {error || queryError instanceof Error ? (
        <Message text={error || (queryError as Error).message} />
      ) : null}
      {loading && !bill ? (
        <Busy label="Updating household totals…" />
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric
              label="DELIVERED CHARGES"
              value={bill ? money(bill.totals.totalAmount) : "—"}
              detail="Scheduled-date rates"
            />
            <Metric
              label="OUTSTANDING ESTIMATE"
              value={bill ? money(bill.totals.totalOutstandingEstimate) : "—"}
              detail={openItems + " open delivery items"}
              tone="orange"
            />
            <Metric
              label="SCHEDULED ITEMS"
              value={bill?.totals.scheduledCount ?? "—"}
              detail={monthTitle(month)}
              tone="blue"
            />
            <Metric
              label="ESTIMATED NET SALARY"
              value={money(
                salaries.reduce((sum, item) => sum + item.netPayable, 0),
              )}
              detail={salaries.length + " staff statements"}
              tone="purple"
            />
          </View>
          <Card>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Ledger outflow</Text>
                <Text style={styles.cardSubtitle}>
                  Manual entries · {monthTitle(month)}
                </Text>
              </View>
              <Text style={styles.total}>{money(ledgerOutflow)}</Text>
            </View>
            <Text style={styles.note}>
              Manual ledger totals are shown separately from calculated product
              charges and salary.
            </Text>
          </Card>
          <View style={styles.panelRow}>
            <Card style={styles.halfPanel}>
              <Text style={styles.cardTitle}>Six-month outflow</Text>
              <Text style={styles.cardSubtitle}>
                Through {monthTitle(month)}
              </Text>
              <Text style={styles.total}>{money(todayOutflow)}</Text>
              <View style={styles.trend}>
                {trend.map((item) => (
                  <View key={item.key} style={styles.trendColumn}>
                    <View style={styles.trendTrack}>
                      <View
                        style={[
                          styles.trendFill,
                          {
                            height: `${item.total ? Math.max(8, (item.total / maxTrend) * 100) : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.trendMonth}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <Card style={styles.halfPanel}>
              <Text style={styles.cardTitle}>Outflow by category</Text>
              <Text style={styles.cardSubtitle}>{monthTitle(month)}</Text>
              {topCategories.length ? (
                topCategories.map(([category, total]) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {category}
                    </Text>
                    <Text style={styles.categoryTotal}>{money(total)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.note}>No recorded outflow.</Text>
              )}
            </Card>
          </View>
          <Card style={styles.activityCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Today’s household activity</Text>
                <Text style={styles.cardSubtitle}>
                  Deliveries and staff attendance · {today}
                </Text>
              </View>
            </View>
            <View style={styles.activitySection}>
              <Text style={styles.sectionLabel}>Deliveries</Text>
              {todaysDeliveries.length ? (
                todaysDeliveries.slice(0, 5).map((item) => (
                  <View key={item.scheduledDeliveryId} style={styles.entryRow}>
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>{item.productName}</Text>
                      <Text style={styles.note}>
                        {item.deliveredQuantity}/{item.expectedQuantity}{" "}
                        {item.unit} · {item.timeSlot}
                      </Text>
                    </View>
                    <Text style={styles.activityStatus}>
                      {item.status.replace("_", " ")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyActivity}>
                  No scheduled deliveries today.
                </Text>
              )}
            </View>
            <View style={[styles.activitySection, styles.attendanceSection]}>
              <Text style={styles.sectionLabel}>Staff attendance</Text>
              {activeStaff.length ? (
                <View style={styles.attendanceCounts}>
                  <Count label="Present" value={presentCount} />
                  <Count label="Absent" value={absentCount} />
                  <Count label="Active staff" value={activeStaff.length} />
                </View>
              ) : (
                <Text style={styles.emptyActivity}>
                  No active staff to summarize.
                </Text>
              )}
            </View>
          </Card>
          <Card>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Manual upcoming payments</Text>
                <Text style={styles.cardSubtitle}>
                  Bills and salary entries not yet marked paid
                </Text>
              </View>
              <Text style={styles.deliveryCount}>{upcoming.length} due</Text>
            </View>
            {upcoming.length ? (
              upcoming.map((entry) => (
                <View key={entry._id} style={styles.entryRow}>
                  <View style={styles.productCopy}>
                    <Text style={styles.productName}>{entry.name}</Text>
                    <Text style={styles.note}>
                      {entry.type} · due{" "}
                      {dateTitle((entry.dueDate || entry.date).slice(0, 10))}
                    </Text>
                  </View>
                  <View style={styles.upcomingActions}>
                    <Text style={styles.productAmount}>
                      {money(entry.amount)}
                    </Text>
                    <Pressable onPress={() => void markPaid(entry)}>
                      <Text style={styles.markPaid}>Mark paid</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.note}>
                All clear. Upcoming bills and salaries will appear here.
              </Text>
            )}
          </Card>
          <Card>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Delivery status</Text>
                <Text style={styles.cardSubtitle}>
                  Scheduled items this month
                </Text>
              </View>
              <Text style={styles.deliveryCount}>{openItems} open</Text>
            </View>
            {bill?.products.length ? (
              bill.products.slice(0, 4).map((product) => (
                <View key={product.productId} style={styles.productRow}>
                  <View style={styles.productCopy}>
                    <Text style={styles.productName}>
                      {product.productName}
                    </Text>
                    <Text style={styles.note}>
                      {product.deliveredQuantity} {product.unit} delivered ·{" "}
                      {product.outstandingQuantity} {product.unit} outstanding
                    </Text>
                  </View>
                  <Text style={styles.productAmount}>
                    {money(product.deliveredAmount)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.note}>
                No scheduled product deliveries in {monthTitle(month)}.
              </Text>
            )}
          </Card>
          <Card>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>Recent ledger entries</Text>
                <Text style={styles.cardSubtitle}>
                  Manual records for this household
                </Text>
              </View>
            </View>
            {entries
              .filter((entry) => entry.date.startsWith(month))
              .slice(0, 5)
              .map((entry) => (
                <View key={entry._id} style={styles.entryRow}>
                  <View style={styles.productCopy}>
                    <Text style={styles.productName}>{entry.name}</Text>
                    <Text style={styles.note}>
                      {entry.type} · {dateTitle(entry.date.slice(0, 10))}
                    </Text>
                  </View>
                  <Text style={styles.productAmount}>
                    {money(entry.amount)}
                  </Text>
                </View>
              ))}
            {!entries.some((entry) => entry.date.startsWith(month)) ? (
              <Text style={styles.note}>
                No manual ledger entries for this month.
              </Text>
            ) : null}
          </Card>
        </>
      )}
      <View style={styles.refreshWrap}>
        <Pressable
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
          accessibilityRole="button"
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>
            {refreshing ? "Refreshing…" : "Refresh overview"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function buildTrend(entries: Entry[], selectedMonth: string) {
  const [year, month] = selectedMonth.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - 5 + index, 15));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const total = entries
      .filter(
        (entry) =>
          entry.date.startsWith(key) &&
          ["expense", "bill", "salary", "delivery"].includes(entry.type) &&
          !["pending", "upcoming"].includes(entry.status),
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      key,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      total,
    };
  });
}
function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.note}>{label}</Text>
    </View>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "green",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "green" | "orange" | "blue" | "purple";
}) {
  const accent =
    tone === "orange"
      ? palette.orange
      : tone === "blue"
        ? palette.blue
        : tone === "purple"
          ? palette.purple
          : palette.green;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricDetail}>{detail}</Text>
      <View style={[styles.accent, { backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 5, paddingTop: 4, paddingBottom: 7 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: palette.muted,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: palette.ink,
  },
  subtitle: { fontSize: 14, color: palette.muted },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    width: "48.3%",
    minHeight: 126,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: palette.line,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: palette.muted,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.ink,
    marginTop: 9,
  },
  metricDetail: { fontSize: 10, color: palette.muted, lineHeight: 14 },
  accent: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 4,
    height: "46%",
    borderTopLeftRadius: 4,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 9,
  },
  cardHeadingCopy: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: palette.ink },
  cardSubtitle: { fontSize: 11, color: palette.muted },
  total: { fontSize: 15, fontWeight: "800", color: palette.green },
  deliveryCount: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: palette.orangeSoft,
    color: palette.orange,
    fontSize: 11,
    fontWeight: "700",
  },
  note: { fontSize: 11, color: palette.muted, lineHeight: 16 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  productCopy: { flex: 1, gap: 3 },
  productName: { fontSize: 14, fontWeight: "700", color: palette.text },
  productAmount: { fontSize: 13, fontWeight: "700", color: palette.text },
  refreshWrap: { alignItems: "center", paddingVertical: 2 },
  refreshButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  refreshText: { fontSize: 13, fontWeight: "700", color: palette.green },
  panelRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  halfPanel: { flex: 1, padding: 12 },
  trend: {
    height: 78,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 10,
  },
  trendColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  trendTrack: {
    height: 52,
    width: "70%",
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#edf2ed",
  },
  trendFill: { width: "100%", borderRadius: 4, backgroundColor: "#65a375" },
  trendMonth: { fontSize: 8, color: palette.muted },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    paddingTop: 10,
  },
  categoryName: { fontSize: 10, color: palette.text, flex: 1 },
  categoryTotal: { fontSize: 10, fontWeight: "700", color: palette.text },
  activityCard: { gap: 0 },
  activitySection: { gap: 5 },
  attendanceSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: palette.ink },
  activityStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.muted,
    textTransform: "capitalize",
  },
  emptyActivity: {
    fontSize: 11,
    lineHeight: 16,
    color: palette.muted,
    paddingVertical: 5,
  },
  attendanceCounts: { flexDirection: "row", gap: 8, marginTop: 3 },
  count: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66,
    padding: 8,
    borderRadius: 10,
    backgroundColor: palette.background,
  },
  countValue: { fontSize: 18, fontWeight: "800", color: palette.ink },
  upcomingActions: { alignItems: "flex-end", gap: 4 },
  markPaid: { fontSize: 10, fontWeight: "700", color: palette.green },
});
