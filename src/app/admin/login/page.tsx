"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function resolveInitialCallbackUrl(): string {
  if (typeof window === "undefined") {
    return "/admin/dashboard";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("callbackUrl") || "/admin/dashboard";
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [callbackUrl] = useState(resolveInitialCallbackUrl);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(result.url || callbackUrl);
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Use your photographer admin credentials to manage events, clients, uploads, and albums.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              disabled={submitting}
              value={email}
              onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-emerald-400/60"
              placeholder="admin@example.com"
            />
          </label>

          <label className="grid gap-2 text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              disabled={submitting}
              value={password}
              onChange={(inputEvent) => setPassword(inputEvent.target.value)}
              className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-emerald-400/60"
              placeholder="Enter your password"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}