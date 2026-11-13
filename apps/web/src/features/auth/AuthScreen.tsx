import { FormEvent, useMemo, useState } from "react";
import { api, setToken } from "../../api";

export function AuthScreen({
  onAuth,
  notice,
}: {
  onAuth: (name: string, email: string, householdId: string) => void;
  notice?: string;
}) {
  const resetToken = useMemo(
    () => new URLSearchParams(window.location.search).get("resetToken") || "",
    [],
  );
  const [mode, setMode] = useState<"signin" | "signup" | "request" | "reset">(
      () => (resetToken ? "reset" : "signin"),
    ),
    [name, setName] = useState(""),
    [householdName, setHouseholdName] = useState("Home"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "request") {
        const result = await api.requestPasswordReset(email);
        setInfo(result.data.message);
        return;
      }
      if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
        const result = await api.resetPassword(resetToken, password);
        window.history.replaceState({}, "", window.location.pathname);
        setPassword("");
        setConfirmPassword("");
        setMode("signin");
        setInfo(result.data.message);
        return;
      }
      const result = await api.auth(signup ? "signup" : "signin", {
        ...(signup ? { name, householdName } : {}),
        email,
        password,
      });
      setToken(result.data.accessToken);
      onAuth(
        result.data.user.name,
        result.data.user.email,
        result.data.user.householdId,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete this request",
      );
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: "signin" | "signup" | "request") {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }
  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "request"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : "Welcome back";
  const description =
    mode === "signup"
      ? "Set up your household to get started."
      : mode === "request"
        ? "Enter your account email and we’ll send a reset link."
        : mode === "reset"
          ? "Choose a new password for your account."
          : "Sign in to manage your household ledger.";
  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} aria-busy={busy}>
        <div className="brand-mark" aria-hidden="true">
          d<span>.</span>
        </div>
        <span className="eyebrow">HOUSEHOLD MANAGEMENT</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {signup && (
          <>
            <label htmlFor="auth-name">
              Your name
              <input
                id="auth-name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label htmlFor="household-name">
              Household name
              <input
                id="household-name"
                required
                minLength={2}
                maxLength={80}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                autoComplete="organization"
              />
            </label>
          </>
        )}
        {mode !== "reset" && (
          <label htmlFor="auth-email">
            Email
            <input
              id="auth-email"
              required
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        )}
        {["signin", "signup", "reset"].includes(mode) && (
          <label htmlFor="auth-password">
            {mode === "reset" ? "New password" : "Password"}
            <div className="password-input-wrap">
              <input
                id="auth-password"
                required
                minLength={signup || mode === "reset" ? 12 : 1}
                maxLength={128}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {(signup || mode === "reset") && (
              <small>Use at least 12 characters.</small>
            )}
          </label>
        )}
        {mode === "reset" && (
          <label htmlFor="auth-confirm-password">
            Confirm new password
            <input
              id="auth-confirm-password"
              required
              minLength={12}
              maxLength={128}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {notice && mode === "signin" && (
          <div className="session-notice" role="status">
            {notice}
          </div>
        )}
        {info && (
          <div className="session-notice" role="status">
            {info}
          </div>
        )}
        {error && (
          <div className="form-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <button disabled={busy} className="button button-primary auth-submit">
          {busy
            ? "Please wait…"
            : signup
              ? "Create account"
              : mode === "request"
                ? "Send reset link"
                : mode === "reset"
                  ? "Update password"
                  : "Sign in"}
        </button>
        {mode === "signin" && (
          <>
            <button
              type="button"
              className="auth-switch"
              onClick={() => switchMode("request")}
            >
              Forgot your password?
            </button>
            <button
              type="button"
              className="auth-switch"
              onClick={() => switchMode("signup")}
            >
              New to Daily Ledger? Create an account
            </button>
          </>
        )}
        {mode === "signup" && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("signin")}
          >
            Already registered? Sign in
          </button>
        )}
        {mode === "request" && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("signin")}
          >
            Back to sign in
          </button>
        )}
        {mode === "reset" && !resetToken && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode("request")}
          >
            Request a new reset link
          </button>
        )}
      </form>
    </main>
  );
}
