"use client";

import { useCallback, useEffect, useState } from "react";

type ClientRecord = {
  _id: string;
  name: string;
  email: string;
};

type PopulatedClient = ClientRecord;

type EventRecord = {
  _id: string;
  title: string;
  date: string;
  locationName?: string | null;
  clientId: PopulatedClient | string;
};

type CreateEventState = {
  title: string;
  date: string;
  locationName: string;
  clientId: string;
};

type ApiListResponse<T> = {
  [key: string]: T[];
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

function getClientName(event: EventRecord, clients: ClientRecord[]): string {
  if (typeof event.clientId !== "string") {
    return event.clientId.name;
  }

  return clients.find((client) => client._id === event.clientId)?.name ?? event.clientId;
}

export default function AdminEventsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateEventState>({
    title: "",
    date: "",
    locationName: "",
    clientId: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [clientsResponse, eventsResponse] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/events"),
      ]);

      if (!clientsResponse.ok) {
        throw new Error("Failed to load clients.");
      }

      if (!eventsResponse.ok) {
        throw new Error("Failed to load events.");
      }

      const clientsData = (await clientsResponse.json()) as ApiListResponse<ClientRecord>;
      const eventsData = (await eventsResponse.json()) as ApiListResponse<EventRecord>;

      setClients(clientsData.clients ?? []);
      setEvents(eventsData.events ?? []);

      setForm((current) =>
        current.clientId || (clientsData.clients ?? []).length === 0
          ? current
          : {
              ...current,
              clientId: clientsData.clients[0]._id,
            }
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const canCreateEvent = clients.length > 0;
  const isInitialLoading = loading && events.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          locationName: form.locationName,
          clientId: form.clientId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create event.");
      }

      setForm({
        title: "",
        date: "",
        locationName: "",
        clientId: form.clientId || clients[0]?._id || "",
      });
      setDialogOpen(false);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100 sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Events
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">
              Manage event records, connect them to clients, and keep the upload pipeline organized.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/clients"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              Create a client first
            </a>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={!canCreateEvent}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              New event
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
              <h2 className="text-lg font-semibold text-white">All events</h2>
              <p className="text-sm text-zinc-400">
                {loading ? "Loading records..." : `${events.length} event${events.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
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
                        <div className="h-4 w-28 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-36 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-zinc-400" colSpan={4}>
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="text-lg font-medium text-white">No events yet</p>
                        <p className="max-w-md text-sm text-zinc-400">
                          Create your first event to connect clients, uploads, and album shares.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {events.map((event) => (
                  <tr key={event._id} className="transition hover:bg-white/[0.04]">
                    <td className="px-6 py-4 font-medium text-white">{event.title}</td>
                    <td className="px-6 py-4 text-zinc-300">{formatDate(event.date)}</td>
                    <td className="px-6 py-4 text-zinc-300">{getClientName(event, clients)}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      <a
                        href={`/admin/events/${event._id}/upload`}
                        className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
                      >
                        Upload photos
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
                <h2 className="text-2xl font-semibold text-white">Create event</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Choose a client, set the event details, and save it for the upload pipeline.
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
                <label className="text-sm font-medium text-zinc-200" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-emerald-400/60"
                  placeholder="Summer wedding"
                  required
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="date">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/60"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="locationName">
                    Location label
                  </label>
                  <input
                    id="locationName"
                    value={form.locationName}
                    onChange={(event) => setForm((current) => ({ ...current, locationName: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/60"
                    placeholder="Brooklyn Bridge Park"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="clientId">
                    Client
                  </label>
                  <a href="/admin/clients" className="text-sm text-emerald-300 transition hover:text-emerald-200">
                    Create one first
                  </a>
                </div>
                <select
                  id="clientId"
                  value={form.clientId}
                  onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/60"
                  required
                >
                  <option value="" disabled>
                    Select a client
                  </option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
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
                  disabled={submitting || !canCreateEvent}
                  className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  {submitting ? "Saving..." : "Save event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}