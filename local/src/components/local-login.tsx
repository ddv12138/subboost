"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { getLocalAdminSetupCredentialError, LOCAL_ADMIN_PASSWORD_MIN_LENGTH } from "@local/lib/admin-credentials";
import { hasAuthConfigHandoff } from "@subboost/ui/store/config-store/auth-handoff";

type AuthState = {
  setupRequired: boolean;
  authenticated: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function getPostLoginHref(): string {
  return hasAuthConfigHandoff() ? "/" : "/dashboard";
}

export function LocalLogin() {
  const [auth, setAuth] = React.useState<AuthState | null>(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => readJson<AuthState>(response))
      .then((nextAuth) => {
        if (!cancelled) {
          setAuth(nextAuth);
          if (nextAuth.authenticated) window.location.href = getPostLoginHref();
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setupRequired = auth?.setupRequired === true;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const credentialError = setupRequired
      ? getLocalAdminSetupCredentialError({ username, password, passwordConfirm })
      : "";
    if (credentialError) {
      setError(credentialError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(setupRequired ? "/api/setup/admin" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, passwordConfirm }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "登录失败");
      window.location.href = getPostLoginHref();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-neutral-950">{setupRequired ? "初始化管理员" : "登录"}</h1>
          <p className="mt-2 text-sm text-neutral-500">{setupRequired ? "创建此实例唯一的管理员账号" : "登录后管理您的订阅"}</p>
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          {auth ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                autoComplete="username"
                placeholder="管理员账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={setupRequired ? "new-password" : "current-password"}
                  aria-describedby={setupRequired ? "local-admin-password-help" : undefined}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 pr-12 text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-950"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {setupRequired ? (
                <p id="local-admin-password-help" className="-mt-1 text-xs text-neutral-500">
                  至少 {LOCAL_ADMIN_PASSWORD_MIN_LENGTH} 个字符
                </p>
              ) : null}
              {setupRequired ? (
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="确认密码"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              ) : null}

              {error ? (
                <p className="text-red-400 text-sm" aria-live="polite">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !username || !password || (setupRequired && !passwordConfirm)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {setupRequired ? "创建管理员" : "登录"}
              </button>
            </form>
          ) : (
            <div className="h-28 animate-pulse rounded-md bg-neutral-100" />
          )}
        </div>
      </div>
    </div>
  );
}
