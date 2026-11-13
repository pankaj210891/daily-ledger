export type Section =
  | "Overview"
  | "Deliveries"
  | "Products & Rates"
  | "Monthly Bills"
  | "Staff & Attendance"
  | "Salary Management"
  | "Household Expenses"
  | "Reports"
  | "Settings"
  | "More";
const sectionSlugs: Record<Section, string> = {
  Overview: "overview",
  Deliveries: "deliveries",
  "Products & Rates": "products-rates",
  "Staff & Attendance": "staff-attendance",
  "Monthly Bills": "monthly-bills",
  "Salary Management": "salary-management",
  "Household Expenses": "household-expenses",
  Reports: "reports",
  Settings: "settings",
  More: "more",
};
export function sectionFromPath(pathname: string): Section {
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return (
    (Object.entries(sectionSlugs).find(([, value]) => value === slug)?.[0] as
      Section | undefined) || "Overview"
  );
}
export function sectionPath(section: Section) {
  return `/${sectionSlugs[section]}`;
}
export const groups: {
  title: string;
  items: { name: Section; icon: string; type?: string }[];
}[] = [
  { title: "WORKSPACE", items: [{ name: "Overview", icon: "▦" }] },
  {
    title: "DAILY OPERATIONS",
    items: [
      { name: "Deliveries", icon: "◷", type: "delivery" },
      { name: "Products & Rates", icon: "▤", type: "product" },
      { name: "Staff & Attendance", icon: "♙", type: "staff" },
    ],
  },
  {
    title: "FINANCES",
    items: [
      { name: "Monthly Bills", icon: "▧", type: "bill" },
      { name: "Salary Management", icon: "₹", type: "salary" },
      { name: "Household Expenses", icon: "↗", type: "expense" },
      { name: "Reports", icon: "▥" },
    ],
  },
  { title: "PREFERENCES", items: [{ name: "Settings", icon: "⚙" }] },
];
export const mobileHeadings: Record<
  Section,
  { eyebrow: string; title: string; subtitle: string }
> = {
  Overview: {
    eyebrow: "DAILY LEDGER",
    title: "Overview",
    subtitle: "Your household at a glance.",
  },
  Deliveries: {
    eyebrow: "DAILY OPERATIONS",
    title: "Deliveries",
    subtitle: "Track scheduled, partial, and completed deliveries.",
  },
  "Products & Rates": {
    eyebrow: "DAILY OPERATIONS",
    title: "Products & rates",
    subtitle:
      "Manage household products, delivery schedules, and rate history.",
  },
  "Monthly Bills": {
    eyebrow: "FINANCES",
    title: "Monthly bills",
    subtitle: "Product charges use the rate effective on each scheduled date.",
  },
  "Staff & Attendance": {
    eyebrow: "DAILY OPERATIONS",
    title: "Staff & attendance",
    subtitle:
      "Manage staff profiles, attendance, household holidays, and salary inputs.",
  },
  "Salary Management": {
    eyebrow: "FINANCES",
    title: "Salary management",
    subtitle:
      "Live estimates based on attendance, leave, holidays, and staff dates.",
  },
  "Household Expenses": {
    eyebrow: "FINANCES",
    title: "Household expenses",
    subtitle: "One-time manual expenses for your household.",
  },
  Reports: {
    eyebrow: "FINANCES",
    title: "Reports",
    subtitle: "Manual ledger activity and outflow for the selected month.",
  },
  Settings: {
    eyebrow: "PREFERENCES",
    title: "Settings",
    subtitle: "Account and household information.",
  },
  More: {
    eyebrow: "DAILY LEDGER",
    title: "More",
    subtitle: "Additional household tools and your account.",
  },
};
export const typeFor: Partial<Record<Section, string>> = {
  Deliveries: "delivery",
  "Products & Rates": "product",
  "Monthly Bills": "bill",
  "Staff & Attendance": "staff",
  "Salary Management": "salary",
  "Household Expenses": "expense",
};
export const typesFor: Partial<Record<Section, string[]>> = {
  "Staff & Attendance": ["staff", "attendance"],
};
