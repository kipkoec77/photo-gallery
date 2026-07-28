import { headers } from "next/headers";

import { GalleryClient } from "../../../components/GalleryClient";

type GalleryPageProps = {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ password?: string }>;
};

type AlbumApiErrorCode =
  | "ALBUM_NOT_FOUND"
  | "ALBUM_EXPIRED"
  | "PASSWORD_REQUIRED"
  | "INVALID_PASSWORD"
  | "EVENT_NOT_FOUND"
  | "UNKNOWN";

type AlbumSuccessPayload = {
  album: {
    eventId: string;
    event: {
      title: string;
      date: string;
      locationName?: string;
    };
  };
};

type AlbumAccessState =
  | { status: "success"; payload: AlbumSuccessPayload }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
  | { status: "password-required"; message: string }
  | { status: "wrong-password"; message: string };

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

async function fetchAlbumAccess(
  shareToken: string,
  password: string | undefined
): Promise<AlbumAccessState> {
  const baseUrl = await getBaseUrl();
  const url = new URL(`${baseUrl}/api/albums/${encodeURIComponent(shareToken)}`);

  if (password?.trim()) {
    url.searchParams.set("password", password.trim());
  }

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (response.ok) {
    const payload = (await response.json()) as AlbumSuccessPayload;
    return { status: "success", payload };
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: AlbumApiErrorCode }
    | null;
  const message = payload?.error ?? "Unable to load this gallery link.";

  switch (payload?.code) {
    case "ALBUM_NOT_FOUND":
    case "EVENT_NOT_FOUND":
      return { status: "invalid", message };
    case "ALBUM_EXPIRED":
      return { status: "expired", message };
    case "PASSWORD_REQUIRED":
      return { status: "password-required", message };
    case "INVALID_PASSWORD":
      return { status: "wrong-password", message };
    default:
      if (response.status === 404) {
        return { status: "invalid", message };
      }
      if (response.status === 410) {
        return { status: "expired", message };
      }
      if (response.status === 401) {
        return { status: "password-required", message };
      }
      return { status: "invalid", message };
  }
}

async function fetchPhotos(eventId: string): Promise<Array<{ _id: string; cloudinaryPublicId: string; takenAt: string; gps: { lat: number; lng: number } | null; locationName: string }>> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/photos?eventId=${encodeURIComponent(eventId)}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  const data: { photos?: Array<{ _id: string; cloudinaryPublicId: string; takenAt: string; gps: { lat: number; lng: number } | null; locationName: string }> } = await response.json();
  return data.photos ?? [];
}

export default async function GalleryPage({ params, searchParams }: GalleryPageProps) {
  const { shareToken } = await params;
  const { password } = await searchParams;
  const albumAccess = await fetchAlbumAccess(shareToken, password);

  if (albumAccess.status === "invalid") {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/30 bg-rose-400/10 px-6 py-14 text-center">
          <h1 className="text-3xl font-semibold text-white">This link is invalid</h1>
          <p className="mt-3 text-sm text-rose-100">{albumAccess.message}</p>
        </div>
      </main>
    );
  }

  if (albumAccess.status === "expired") {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/30 bg-amber-300/10 px-6 py-14 text-center">
          <h1 className="text-3xl font-semibold text-white">This link has expired</h1>
          <p className="mt-3 text-sm text-amber-100">{albumAccess.message}</p>
        </div>
      </main>
    );
  }

  if (
    albumAccess.status === "password-required" ||
    albumAccess.status === "wrong-password"
  ) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 px-6 py-10 shadow-2xl shadow-black/30">
          <h1 className="text-3xl font-semibold text-white">Password protected gallery</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Enter the gallery password to view these photos.
          </p>

          {albumAccess.status === "wrong-password" ? (
            <p className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Wrong password. Please try again.
            </p>
          ) : null}

          <form className="mt-6 grid gap-4" method="GET">
            <input
              name="password"
              type="password"
              required
              className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-emerald-400/60"
              placeholder="Enter password"
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              View gallery
            </button>
          </form>
        </div>
      </main>
    );
  }

  const album = albumAccess.payload.album;
  const photos = await fetchPhotos(album.eventId);
  const eventDate = new Date(album.event.date);
  const formattedDate = Number.isNaN(eventDate.valueOf())
    ? album.event.date
    : eventDate.toLocaleDateString();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Private gallery
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {album.event.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-zinc-300">
              {formattedDate}
              {album.event.locationName ? ` - ${album.event.locationName}` : ""}
            </p>
          </div>

        </header>

        <GalleryClient photos={photos} shareToken={shareToken} password={password} />
      </div>
    </main>
  );
}