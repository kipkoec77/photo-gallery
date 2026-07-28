"use client";

import { useCallback, useEffect, useState } from "react";

type ClientRecord = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

type CreateClientState = {
  name: string;
  email: string;
};

type ApiListResponse<T> = {
  [key: string]: T[];
};

type ApiCreateResponse = {
  client?: ClientRecord;
  error?: string;
};

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateClientState>({
    name: "",
    email: "",
  });

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients");

      if (!response.ok) {
        throw new Error("Failed to load clients.");
      }

      const body = (await response.json()) as ApiListResponse<ClientRecord>;
      setClients(body.clients ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadClients]);

  const isInitialLoading = loading && clients.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiCreateResponse | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to create client.");
      }

      if (!body?.client) {
        throw new Error("Failed to create client.");
      }

      setForm({
        name: "",
        email: "",
      });
      setDialogOpen(false);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100 sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Clients</h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">
              Keep your client list organized so events, uploads, and galleries stay connected.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/events"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              Back to events
            </a>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              New client
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/25">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">All clients</h2>
              <p className="text-sm text-zinc-400">
                {loading ? "Loading records..." : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/40 text-zinc-100">
                {isInitialLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-52 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-zinc-400" colSpan={4}>
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="text-lg font-medium text-white">No clients yet</p>
                        <p className="max-w-md text-sm text-zinc-400">
                          Add your first client so events can be assigned and galleries can stay organized.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {clients.map((client) => (
                  <tr key={client._id} className="transition hover:bg-white/[0.04]">
                    <td className="px-6 py-4 font-medium text-white">{client.name}</td>
                    <td className="px-6 py-4 text-zinc-300">{client.email}</td>
                    <td className="px-6 py-4 text-zinc-300">{formatDate(client.createdAt)}</td>
                    <td className="px-6 py-4 text-zinc-300">
                      <a
                        href={`/admin/events?clientId=${client._id}`}
                        className="font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        View events
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Create client</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Add the client name and email address so events can be linked to them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-200" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-emerald-400/60"
                  placeholder="Jordan Lee"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-200" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-emerald-400/60"
                  placeholder="jordan@example.com"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  {submitting ? "Saving..." : "Save client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}