import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearSessionMarker,
  getToken,
  hadSession,
  setToken,
} from "../api";

export function useSession() {
  const [user, setUser] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState("");

  const authenticate = useCallback(
    (name: string, email: string, nextHouseholdId: string) => {
      setAuthNotice("");
      setUser(name);
      setUserEmail(email);
      setHouseholdId(nextHouseholdId);
    },
    [],
  );

  const expireSession = useCallback((message: string) => {
    setToken(null);
    setUser("");
    setUserEmail("");
    setHouseholdId("");
    setAuthNotice(message);
  }, []);

  async function signOut() {
    try {
      await api.signout();
    } catch {
      // Clear local session state even when the API is unavailable.
    } finally {
      setToken(null);
      clearSessionMarker();
      setUser("");
      setUserEmail("");
      setHouseholdId("");
      setAuthNotice("");
    }
  }

  useEffect(() => {
    void (async () => {
      const hadPriorSession = hadSession();
      try {
        if (!getToken()) {
          const result = await api.refresh();
          setToken(result.data.accessToken);
        }
        const result = await api.me();
        setUser(result.data.name);
        setUserEmail(result.data.email);
        setHouseholdId(result.data.householdId);
      } catch {
        if (hadPriorSession)
          setAuthNotice("Your session expired. Sign in again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return {
    user,
    userEmail,
    householdId,
    loading,
    authNotice,
    setAuthNotice,
    authenticate,
    expireSession,
    signOut,
  };
}
