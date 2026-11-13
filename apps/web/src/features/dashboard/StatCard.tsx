export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "green",
  onClick,
  className = "",
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{detail}</div>
      {onClick && <span className="stat-card-link">View details →</span>}
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`stat-card stat-card-action ${className}`}
      onClick={onClick}
      aria-label={`${label}: ${value}. ${detail}. View details`}
    >
      {content}
    </button>
  ) : (
    <article className={`stat-card ${className}`}>{content}</article>
  );
}
