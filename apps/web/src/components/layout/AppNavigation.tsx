import { Section, groups } from "../../app/sectionConfig";

function MobileTabIcon({
  name,
  active = false,
}: {
  name: "home" | "deliveries" | "bills" | "staff" | "more";
  active?: boolean;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
      className="mobile-tab-icon"
      {...common}
    >
      {name === "home" &&
        (active ? (
          <>
            <path
              d="m12 3 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z"
              fill="currentColor"
              stroke="none"
            />
            <path d="M9 21v-7h6v7" stroke="white" />
          </>
        ) : (
          <>
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v11h14V9M9 20v-7h6v7" />
          </>
        ))}
      {name === "deliveries" && (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v8.5M8 5.2l8 4.6" />
        </>
      )}
      {name === "bills" && (
        <>
          <path d="M6 3h9l4 4v14H6z" fill={active ? "currentColor" : "none"} />
          <path
            d="M14 3v5h5M9 12h7M9 16h7"
            stroke={active ? "white" : "currentColor"}
          />
        </>
      )}
      {name === "staff" && (
        <>
          <circle cx="9" cy="8" r="3" fill={active ? "currentColor" : "none"} />
          <path
            d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20z"
            fill={active ? "currentColor" : "none"}
          />
          <path d="M16 5.3a3 3 0 0 1 0 5.4M17 14a5.5 5.5 0 0 1 3.5 5.1V20" />
        </>
      )}
      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

export function AppNavigation({
  active,
  user,
  onNavigate,
  onSignOut,
}: {
  active: Section;
  user: string;
  onNavigate: (section: Section) => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            d<span>.</span>
          </div>
          <div>
            <div className="brand-name">daily ledger</div>
            <div className="brand-caption">HOUSEHOLD MANAGEMENT</div>
          </div>
        </div>
        <div className="household-switch">
          <div className="household-avatar">H</div>
          <div className="household-copy">
            <strong>My household</strong>
            <span>Household owner</span>
          </div>
        </div>
        <nav className="side-nav">
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <div className="nav-label">{g.title}</div>
              {g.items.map((i) => (
                <button
                  key={i.name}
                  className={`nav-item ${active === i.name ? "active" : ""}`}
                  aria-current={active === i.name ? "page" : undefined}
                  onClick={() => onNavigate(i.name)}
                >
                  <span className="nav-icon">{i.icon}</span>
                  <span>{i.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="profile-row">
          <div className="profile-avatar">{user.slice(0, 2).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{user}</strong>
            <span>Household owner</span>
          </div>
          <button className="more-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {[
          { name: "Overview" as Section, icon: "home" as const, label: "Home" },
          {
            name: "Deliveries" as Section,
            icon: "deliveries" as const,
            label: "Deliveries",
          },
          {
            name: "Monthly Bills" as Section,
            icon: "bills" as const,
            label: "Bills",
          },
          {
            name: "Staff & Attendance" as Section,
            icon: "staff" as const,
            label: "Staff",
          },
        ].map((item) => (
          <button
            key={item.name}
            className={active === item.name ? "active" : ""}
            aria-current={active === item.name ? "page" : undefined}
            onClick={() => onNavigate(item.name)}
          >
            <span>
              <MobileTabIcon name={item.icon} active={active === item.name} />
            </span>
            <small>{item.label}</small>
          </button>
        ))}
        <button
          className={
            active === "More" ||
            ![
              "Overview",
              "Deliveries",
              "Monthly Bills",
              "Staff & Attendance",
            ].includes(active)
              ? "active"
              : ""
          }
          aria-current={active === "More" ? "page" : undefined}
          onClick={() => onNavigate("More")}
        >
          <span>
            <MobileTabIcon
              name="more"
              active={
                active === "More" ||
                ![
                  "Overview",
                  "Deliveries",
                  "Monthly Bills",
                  "Staff & Attendance",
                ].includes(active)
              }
            />
          </span>
          <small>More</small>
        </button>
      </nav>
    </>
  );
}
