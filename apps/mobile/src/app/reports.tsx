import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { DateField } from "@/components/DateField";
import { api, type Entry } from "@/lib/api";
import { ledgerQueries } from "@/lib/queries";
import { dateTitle, monthKey, monthTitle, money } from "@/lib/dates";
import { palette } from "@/lib/theme";
import {
  ActionButton,
  Busy,
  Card,
  Message,
  MonthPicker,
  PageHeading,
  Screen,
} from "@/components/ui";

const statuses = [
  "all",
  "recorded",
  "pending",
  "paid",
  "upcoming",
  "present",
  "absent",
];
const spendTypes = ["expense", "bill", "salary", "delivery"];
const EMPTY_ENTRIES: Entry[] = [];
export default function ReportsScreen() {
  const [month, setMonth] = useState(monthKey());
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const entriesQuery = ledgerQueries.useEntries();
  const allEntries = entriesQuery.data ?? EMPTY_ENTRIES;
  const invalidateLedger = ledgerQueries.useInvalidateLedger();
  const load = async () => {
    setError("");
    await invalidateLedger();
  };
  const entries = useMemo(
    () =>
      allEntries
        .filter(
          (item) =>
            item.date.slice(0, 7) === month &&
            (status === "all" || item.status === status),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allEntries, month, status],
  );
  const periodEntries = useMemo(
    () => allEntries.filter((item) => item.date.slice(0, 7) === month),
    [allEntries, month],
  );
  const spend = periodEntries
    .filter(
      (item) =>
        spendTypes.includes(item.type) &&
        !["pending", "upcoming"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const deliveries = periodEntries.filter(
    (item) => item.type === "delivery",
  ).length;
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of periodEntries) {
      if (
        spendTypes.includes(item.type) &&
        !["pending", "upcoming"].includes(item.status)
      ) {
        const label = item.category || "General";
        totals.set(label, (totals.get(label) || 0) + item.amount);
      }
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [periodEntries]);
  const maxCategory = Math.max(1, ...categories.map(([, value]) => value));
  async function saveEdit(
    entry: Entry,
    input: {
      name: string;
      category: string;
      amount: number;
      date: string;
      status: string;
      notes: string;
    },
  ) {
    try {
      await api.updateEntry(entry._id, input);
      setEditing(null);
      await load();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to update report record.",
      );
    }
  }
  async function deleteEntry(id: string) {
    try {
      await api.deleteEntry(id);
      setRemoving(null);
      await load();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to delete report record.",
      );
    }
  }
  return (
    <Screen>
      <Text onPress={() => router.back()} style={styles.back}>
        ‹ More
      </Text>
      <PageHeading
        eyebrow="FINANCES"
        title="Reports"
        subtitle="Manual ledger activity and outflow for the selected month."
      />
      <MonthPicker month={month} onChange={setMonth} />
      {error || entriesQuery.error instanceof Error ? (
        <Message text={error || (entriesQuery.error as Error).message} />
      ) : null}
      <View style={styles.metrics}>
        <Metric label="RECORDED OUTFLOW" value={money(spend)} month={month} />
        <Metric
          label="RECORDS IN PERIOD"
          value={periodEntries.length}
          month={month}
        />
        <Metric label="DELIVERY RECORDS" value={deliveries} month={month} />
      </View>
      <Card>
        <Text style={styles.sectionTitle}>Ledger outflow by category</Text>
        <Text style={styles.helper}>{monthTitle(month)}</Text>
        {categories.length ? (
          categories.map(([label, value]) => (
            <View key={label} style={styles.category}>
              <View style={styles.categoryHead}>
                <Text style={styles.categoryName}>{label}</Text>
                <Text style={styles.categoryValue}>{money(value)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.max(4, (value / maxCategory) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.helper}>No recorded outflow in this month.</Text>
        )}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Monthly activity</Text>
        <Text style={styles.helper}>Records dated in {monthTitle(month)}.</Text>
        <View style={styles.filters}>
          {statuses.map((option) => (
            <Pressable
              key={option}
              onPress={() => setStatus(option)}
              style={[styles.filter, status === option && styles.filterActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  status === option && styles.filterTextActive,
                ]}
              >
                {option === "all" ? "All" : option}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.count}>
          {entries.length} {entries.length === 1 ? "record" : "records"}
        </Text>
        {entriesQuery.isLoading ? (
          <Busy label="Loading report records…" />
        ) : entries.length ? (
          entries.map((entry) => (
            <View key={entry._id} style={styles.entry}>
              <View style={styles.entryCopy}>
                <Text style={styles.entryName}>{entry.name}</Text>
                <Text style={styles.helper}>
                  {dateTitle(entry.date.slice(0, 10))} ·{" "}
                  {entry.category || entry.type} · {entry.status}
                </Text>
                <View style={styles.entryActions}>
                  <Pressable onPress={() => setEditing(entry)}>
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  {removing === entry._id ? (
                    <>
                      <Pressable onPress={() => setRemoving(null)}>
                        <Text style={styles.link}>Keep</Text>
                      </Pressable>
                      <Pressable onPress={() => void deleteEntry(entry._id)}>
                        <Text style={styles.delete}>Confirm delete</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={() => setRemoving(entry._id)}>
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={styles.entryAmount}>{money(entry.amount)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.helper}>
            No records match this month and status.
          </Text>
        )}
      </Card>
      {editing ? (
        <ReportEntryEditor
          key={editing._id}
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => saveEdit(editing, input)}
        />
      ) : null}
    </Screen>
  );
}
function ReportEntryEditor({
  entry,
  onClose,
  onSave,
}: {
  entry: Entry;
  onClose: () => void;
  onSave: (input: {
    name: string;
    category: string;
    amount: number;
    date: string;
    status: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(entry.name);
  const [category, setCategory] = useState(entry.category || "");
  const [amount, setAmount] = useState(String(entry.amount));
  const [date, setDate] = useState(entry.date.slice(0, 10));
  const [status, setStatus] = useState(entry.status);
  const [notes, setNotes] = useState(entry.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!name.trim()) return setError("Enter a record name.");
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0)
      return setError("Enter a valid amount.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return setError("Enter a valid date in YYYY-MM-DD format.");
    setBusy(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        amount: Number(amount),
        date,
        status,
        notes,
      });
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Unable to save record.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalShade}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Edit {entry.type}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.editForm}
            keyboardShouldPersistTaps="handled"
          >
            <EditField label="Name" value={name} onChangeText={setName} />
            <EditField
              label="Category"
              value={category}
              onChangeText={setCategory}
            />
            <EditField
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <DateField label="Record date" value={date} onChange={setDate} />
            <EditField label="Status" value={status} onChangeText={setStatus} />
            <EditField label="Notes" value={notes} onChangeText={setNotes} />
            {error ? <Message text={error} /> : null}
            <ActionButton
              title={busy ? "Saving…" : "Save changes"}
              disabled={busy}
              onPress={() => void submit()}
            />
            <ActionButton title="Cancel" secondary onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function EditField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "decimal-pad";
}) {
  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.editInput}
      />
    </View>
  );
}
function Metric({
  label,
  value,
  month,
}: {
  label: string;
  value: string | number;
  month: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.helper}>{monthTitle(month)}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  back: {
    minHeight: 38,
    textAlignVertical: "center",
    color: palette.green,
    fontSize: 14,
    fontWeight: "700",
  },
  metrics: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    minHeight: 106,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "white",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: palette.muted,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: palette.ink },
  helper: { fontSize: 11, lineHeight: 16, color: palette.muted, marginTop: 4 },
  category: { gap: 6, paddingTop: 12 },
  categoryHead: { flexDirection: "row", justifyContent: "space-between" },
  categoryName: { fontSize: 12, fontWeight: "700", color: palette.text },
  categoryValue: { fontSize: 12, fontWeight: "700", color: palette.text },
  track: {
    height: 7,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#edf2ed",
  },
  fill: { height: "100%", borderRadius: 5, backgroundColor: "#65a375" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  filter: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: palette.line,
  },
  filterActive: { backgroundColor: palette.greenSoft, borderColor: "#c9dfcc" },
  filterText: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.text,
    textTransform: "capitalize",
  },
  filterTextActive: { color: palette.green },
  count: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.muted,
    marginTop: 12,
  },
  entry: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 9,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  entryCopy: { flex: 1 },
  entryName: { fontSize: 13, fontWeight: "800", color: palette.ink },
  entryAmount: { fontSize: 13, fontWeight: "800", color: palette.text },
  entryActions: { flexDirection: "row", gap: 15, marginTop: 9 },
  link: { fontSize: 12, fontWeight: "700", color: palette.green },
  delete: { fontSize: 12, fontWeight: "700", color: palette.red },
  modalShade: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#17271d77",
  },
  modal: {
    maxHeight: "92%",
    padding: 20,
    paddingBottom: 28,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: palette.ink },
  editForm: { gap: 12, paddingBottom: 8 },
  editField: { gap: 5 },
  editLabel: { fontSize: 12, fontWeight: "700", color: palette.text },
  editInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: palette.text,
  },
});
