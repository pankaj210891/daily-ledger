const statusIcons: Record<string, string> = {
  recorded: "✓", paid: "✓", present: "✓", pending: "◷", upcoming: "◷", absent: "!",
  partially_delivered: "◒", fully_delivered: "✓", cancelled: "×", skipped: "↷", zero_consumption: "0"
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
  return <span className={`status status-${status} status-badge`}>
    <span aria-hidden="true">{statusIcons[status] || "•"}</span>
    <span>{label}</span>
  </span>;
}
