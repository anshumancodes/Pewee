"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cmsHref } from "@/site.config";

const REASON_MESSAGES: Record<string, string> = {
  unauthenticated: "Please sign in to access the dashboard.",
  forbidden: "You need to be an admin to access the dashboard.",
  session_expired: "Your session has expired. Please sign in again.",
};

// Isolated so useSearchParams is inside a Suspense boundary (required by Next.js)
function RedirectNotice({ onNotice }: { onNotice: (msg: string) => void }) {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "";
  const message = REASON_MESSAGES[reason] ?? "";

  useEffect(() => {
    if (message) onNotice(message);
  }, [message, onNotice]);

  return null;
}

function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Login failed.");
        return;
      }

      router.push(cmsHref());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      {/* Reads ?reason= param and sets error message */}
      <Suspense fallback={null}>
        <RedirectNotice onNotice={setError} />
      </Suspense>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-gray-500 mb-3">
            Admin
          </p>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
            Sign in
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Dashboard access is restricted to admins.
          </p>
        </div>

        {/* Error / redirect notice */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-[0.15em] text-gray-500 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-[0.15em] text-gray-500 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-gray-900 py-2.5 text-sm font-medium text-white tracking-wide hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return <LoginForm />;
}
