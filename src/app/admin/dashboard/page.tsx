import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";

import { connectToDatabase } from "../../../lib/mongodb";
import Album from "../../../models/Album";
import Client from "../../../models/Client";
import Event from "../../../models/Event";
import Photo from "../../../models/Photo";

type DashboardCounts = {
  totalClients: number;
  totalEvents: number;
  photosThisMonth: number;
  activeAlbums: number;
};

type RecentEventSummary = {
  _id: string;
  title: string;
  date: Date;
  clientName: string | null;
};

type ExpiringAlbumSummary = {
  _id: string;
  shareToken: string;
  expiresAt: Date;
  eventTitle: string | null;
};

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString();
}

function formatRelativeExpiry(expiresAt: Date): string {
  const days = differenceInCalendarDays(expiresAt, new Date());

  if (days <= 0) {
    return "Expires today";
  }

  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function createMonthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { start, end };
}

export default async function AdminDashboardPage() {
  await connectToDatabase();

  const now = new Date();
  const monthRange = createMonthRange(now);
  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  const [totalClients, totalEvents, photosThisMonth, activeAlbums, recentEvents, expiringAlbums] =
    await Promise.all([
      Client.countDocuments(),
      Event.countDocuments(),
      Photo.countDocuments({
        createdAt: {
          $gte: monthRange.start,
          $lt: monthRange.end,
        },
      }),
      Album.countDocuments({
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      }),
      Event.aggregate<RecentEventSummary>([
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: Client.collection.name,
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        {
          $unwind: {
            path: "$client",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            title: 1,
            date: 1,
            clientName: "$client.name",
          },
        },
      ]),
      Album.aggregate<ExpiringAlbumSummary>([
        {
          $match: {
            expiresAt: {
              $ne: null,
              $gte: now,
              $lte: nextSevenDays,
            },
          },
        },
        { $sort: { expiresAt: 1 } },
        {
          $lookup: {
            from: Event.collection.name,
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        {
          $unwind: {
            path: "$event",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            shareToken: 1,
            expiresAt: 1,
            eventTitle: "$event.title",
          },
        },
      ]),
    ]);

  const counts: DashboardCounts = {
    totalClients,
    totalEvents,
    photosThisMonth,
    activeAlbums,
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100 sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">
              A quick overview of clients, events, uploads, and expiring client albums.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/clients"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              New client
            </Link>
            <Link
              href="/admin/events"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              New event
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total clients", value: counts.totalClients },
            { label: "Total events", value: counts.totalEvents },
            { label: "Photos uploaded this month", value: counts.photosThisMonth },
            { label: "Active albums", value: counts.activeAlbums },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl shadow-black/25"
            >
              <p className="text-sm font-medium text-zinc-400">{card.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {card.value.toLocaleString()}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent events</h2>
                <p className="text-sm text-zinc-400">Last 5 events by creation time</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-zinc-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Event</th>
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-zinc-950/40 text-zinc-100">
                  {recentEvents.length === 0 ? (
                    <tr>
                      <td className="px-6 py-10 text-zinc-400" colSpan={3}>
                        <div className="flex flex-col items-center gap-2 text-center">
                          <p className="text-base font-medium text-white">No recent events</p>
                          <p className="text-sm text-zinc-400">Create an event to populate this panel.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {recentEvents.map((event) => (
                    <tr key={event._id} className="transition hover:bg-white/[0.04]">
                      <td className="px-6 py-4 font-medium text-white">
                        <Link
                          href={`/admin/events/${event._id}/upload`}
                          className="transition hover:text-emerald-300"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{event.clientName ?? "Unassigned"}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(event.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/25">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Expiring soon</h2>
              <p className="text-sm text-zinc-400">Albums that expire within 7 days</p>
            </div>

            <div className="space-y-3 p-6">
              {expiringAlbums.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-zinc-400">
                  <p className="text-base font-medium text-white">No albums expiring soon</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Everything is either long-lived or already renewed.
                  </p>
                </div>
              ) : null}

              {expiringAlbums.map((album) => (
                <article key={album._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">{album.eventTitle ?? "Untitled event"}</p>
                  <p className="mt-1 text-sm text-zinc-300">{formatRelativeExpiry(album.expiresAt)}</p>
                  <p className="mt-2 text-xs text-zinc-500">Expires on {formatDate(album.expiresAt)}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}