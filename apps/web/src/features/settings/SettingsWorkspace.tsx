import { useState } from "react";

export function SettingsWorkspace({
  user,
  email,
  householdId,
  onSignOut,
}: {
  user: string;
  email: string;
  householdId: string;
  onSignOut: () => void;
}) {
  return (
    <section className="panel settings-workspace">
      <div className="panel-heading">
        <div>
          <h2>Account and household</h2>
          <p>Signed in as {user}</p>
        </div>
      </div>
      <div className="settings-account-details">
        <strong>ACCOUNT</strong>
        <span>{user}</span>
        <span>{email}</span>
        <span>Household ID · {householdId}</span>
      </div>
      <div className="settings-notice">
        <strong>Household preferences aren’t available yet.</strong>
        <p>
          The API does not expose profile, household, reminder, or preference
          settings yet.
        </p>
      </div>
      <button className="button button-secondary" onClick={onSignOut}>
        Sign out
      </button>
    </section>
  );
}
