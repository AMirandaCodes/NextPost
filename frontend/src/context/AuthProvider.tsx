import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { TOKEN_KEY } from "../api/client";
import { isDemoMode } from "../lib/demo";
import { secondaryButtonClass } from "../lib/styles";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [demoFailed, setDemoFailed] = useState(false);
  const [demoAttempt, setDemoAttempt] = useState(0);
  const queryClient = useQueryClient();

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
  }, []);

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      await authApi.register(payload);
      await login(payload.email, payload.password);
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.clear(); // drop every cached response belonging to the old session
  }, [queryClient]);

  // Demo mode: visitors get a session automatically instead of a login page.
  useEffect(() => {
    if (!isDemoMode() || token !== null) return;
    let cancelled = false;
    setDemoFailed(false);
    authApi
      .demoLogin()
      .then((data) => {
        if (cancelled) return;
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
      })
      .catch(() => {
        if (!cancelled) setDemoFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, demoAttempt]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, isAuthenticated: token !== null, login, register, logout }),
    [token, login, register, logout],
  );

  if (isDemoMode() && token === null) {
    return <DemoSplash failed={demoFailed} onRetry={() => setDemoAttempt((n) => n + 1)} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function DemoSplash({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-2xl font-bold text-indigo-700">NextPost</p>
      {failed ? (
        <>
          <p role="alert" className="text-slate-600">
            The demo server didn't respond. It may still be waking up — please try again.
          </p>
          <button type="button" onClick={onRetry} className={secondaryButtonClass}>
            Try again
          </button>
        </>
      ) : (
        <>
          <span
            role="status"
            aria-label="Preparing your demo"
            className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
          />
          <p className="text-slate-600">Preparing your demo…</p>
          <p className="max-w-sm text-sm text-slate-400">
            This demo runs on free hosting that sleeps when idle — the first visit can take
            up to a minute to wake it.
          </p>
        </>
      )}
    </main>
  );
}
