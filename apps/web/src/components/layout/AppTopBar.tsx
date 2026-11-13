import { PageHeaderProps } from "./PageHeaderProps";

export function AppTopBar(props: PageHeaderProps) {
  const {
    active,
    user,
    userEmail,
    entries,
    notifications,
    search,
    setSearch,
    headerMenu,
    setHeaderMenu,
    onSignOut,
    quickAddOpen,
    setQuickAddOpen,
    onNavigate,
    onStartAdd,
    onRequestProductCreate,
    onOpenEntry,
    selectedMonth,
    setSelectedMonth,
    error,
    onRetry,
  } = props;
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <b>/</b>
        <strong>{active}</strong>
      </div>
      <div className="top-actions">
        {active !== "Settings" && (
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search ledger"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ledger…"
            />
          </label>
        )}
        <div
          className="header-menu-wrap"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setHeaderMenu(null);
          }}
        >
          <button
            className="icon-button notification"
            aria-label={`Notifications${notifications.length ? `, ${notifications.length} pending` : ""}`}
            aria-expanded={headerMenu === "notifications"}
            aria-controls="notifications-panel"
            onClick={() =>
              setHeaderMenu((v) =>
                v === "notifications" ? null : "notifications",
              )
            }
          >
            ♧{notifications.length > 0 && <i />}
          </button>
          {headerMenu === "notifications" && (
            <div
              className="header-popover notification-panel"
              id="notifications-panel"
              role="region"
              aria-label="Notifications"
            >
              <div className="popover-heading">
                <strong>Needs attention</strong>
                <button
                  aria-label="Close notifications"
                  onClick={() => setHeaderMenu(null)}
                >
                  ×
                </button>
              </div>
              {notifications.length ? (
                notifications.map((item) => (
                  <button
                    className="notification-item"
                    key={item._id}
                    onClick={() => {
                      setHeaderMenu(null);
                      onOpenEntry(item);
                    }}
                  >
                    <span className="notification-dot">◷</span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.type} · {item.status}
                      </small>
                    </span>
                    <b>→</b>
                  </button>
                ))
              ) : (
                <p className="notifications-empty">You’re all caught up.</p>
              )}
            </div>
          )}
        </div>
        <div className="top-divider" />
        <div
          className="header-menu-wrap"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setHeaderMenu(null);
          }}
        >
          <button
            className="top-profile"
            aria-expanded={headerMenu === "profile"}
            aria-controls="profile-panel"
            onClick={() =>
              setHeaderMenu((v) => (v === "profile" ? null : "profile"))
            }
          >
            <span className="profile-avatar small">
              {user.slice(0, 2).toUpperCase()}
            </span>
            <span className="top-profile-name">{user}</span>
            <span className="chevron">⌄</span>
          </button>
          {headerMenu === "profile" && (
            <div
              className="header-popover profile-panel"
              id="profile-panel"
              role="region"
              aria-label="Account options"
            >
              <p>
                Signed in as <strong>{user}</strong>
              </p>
              <button
                onClick={() => {
                  setHeaderMenu(null);
                  void onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
