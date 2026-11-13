import { Entry } from "../../api";
import { householdDateKey, householdMonthKey } from "../../lib/formatters";
import type { Section } from "../../app/sectionConfig";
import { StatCard } from "./StatCard";

export const featureLimitations: Partial<Record<Section, string>> = {
  Deliveries:
    "Delivery records save the selected product name, unit, quantity and date. The API cannot link a delivery to a product record, schedule time slots, or track partial/outstanding, skipped, cancelled or zero-consumption states.",
  "Products & Rates":
    "A product record stores its current rate and unit. Editing replaces that rate; schedules, active/archive state and effective-dated rate history are not available yet.",
  "Monthly Bills":
    "This API does not calculate product-wise bills using scheduled-date rate history. The list below shows saved bill records only.",
  "Staff & Attendance":
    "Basic staff and present/absent records are supported. Leave types, weekly offs, salary policies and effective-dated histories are not available yet.",
  "Salary Management":
    "This API stores manual salary records only. It does not calculate deductions, revisions, advances, partial payments or locked statements.",
  "Household Expenses":
    "One-time expense records are supported. Recurrence, payment allocations and outstanding balance history are not available yet.",
};

export function PhaseFourSummary({
  section,
  entries,
}: {
  section: Section;
  entries: Entry[];
}) {
  if (section === "Products & Rates") {
    const products = entries.filter((entry) => entry.type === "product");
    return (
      <section className="stat-grid phase-summary" aria-label="Product summary">
        <StatCard
          label="PRODUCT RECORDS"
          value={String(products.length)}
          detail="Current products and rates"
          icon="▤"
          tone="blue"
        />
        <StatCard
          label="UNITS IN USE"
          value={String(
            new Set(products.map((product) => product.unit).filter(Boolean))
              .size,
          )}
          detail="Distinct recorded units"
          icon="◉"
          tone="purple"
        />
      </section>
    );
  }
  const deliveries = entries.filter((entry) => entry.type === "delivery"),
    today = householdDateKey(new Date()),
    month = householdMonthKey(new Date());
  return (
    <section className="stat-grid phase-summary" aria-label="Delivery summary">
      <StatCard
        label="TODAY’S RECORDS"
        value={String(
          deliveries.filter((entry) => householdDateKey(entry.date) === today)
            .length,
        )}
        detail="Deliveries dated today"
        icon="◷"
        tone="blue"
      />
      <StatCard
        label="THIS MONTH"
        value={String(
          deliveries.filter((entry) => householdMonthKey(entry.date) === month)
            .length,
        )}
        detail="Saved delivery records"
        icon="▤"
        tone="purple"
      />
    </section>
  );
}
