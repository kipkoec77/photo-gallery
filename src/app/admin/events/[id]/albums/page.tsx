"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CreatedAlbumResponse = {
  shareUrl: string;
  album: {
    shareToken: string;
    isPrivate: boolean;
    hasPassword: boolean;
    expiresAt: string | null;
  };
};

type ApiErrorResponse = {
  error?: string;
};

type AlbumRecord = {
  _id: string;
  shareToken: string;
  isPrivate: boolean;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
};

function normalizeEventId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function AdminEventAlbumsPage() {
  const params = useParams<{ id: string | string[] }>();
  const eventId = normalizeEventId(params.id);
  const galleryOrigin = typeof window === "undefined" ? "" : window.location.origin;

  const [isPrivate, setIsPrivate] = useState(true);
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdAlbum, setCreatedAlbum] = useState<CreatedAlbumResponse | null>(null);
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);

  const loadAlbums = useCallback(async () => {
    setLoadingAlbums(true);
    setError(null);

    try {
      const response = await fetch(`/api/albums?eventId=${encodeURIComponent(eventId)}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(payload?.error ?? "Failed to load albums.");
      }

      const payload = (await response.json()) as { albums?: AlbumRecord[] };
      setAlbums(payload.albums ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load albums.");
    } finally {
      setLoadingAlbums(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAlbums();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAlbums]);

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const parsedExpiresInDays = expiresInDays.trim()
        ? Number(expiresInDays.trim())
        : undefined;

      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          isPrivate,
          password: password.trim() || undefined,
          expiresInDays: parsedExpiresInDays,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(payload?.error ?? "Failed to create album.");
      }

      const payload = (await response.json()) as CreatedAlbumResponse;
      setCreatedAlbum(payload);
      await loadAlbums();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create album.");
      setCreatedAlbum(null);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!createdAlbum?.shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(createdAlbum.shareUrl);
  }

  const isInitialLoading = loadingAlbums && albums.length === 0;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 shadow-2xl shadow-black/30">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Create Album Link
          </h1>
          <p className="mt-2 text-sm text-zinc-300">Event ID: {eventId}</p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/80 px-6 py-6 shadow-2xl shadow-black/25">
          <form className="grid gap-5" onSubmit={handleCreateAlbum}>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm font-medium text-zinc-100">Private album</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                onClick={() => setIsPrivate((current) => !current)}
                className={`relative h-7 w-14 rounded-full transition ${
                  isPrivate ? "bg-emerald-400" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-zinc-950 transition ${
                    isPrivate ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </label>

            <label className="grid gap-2 text-sm text-zinc-300">
              <span className="font-medium text-zinc-100">Optional password</span>
              <input
                type="password"
                value={password}
                onChange={(inputEvent) => setPassword(inputEvent.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 outline-none focus:border-emerald-400/60"
                placeholder="Leave blank for token-only access"
              />
            </label>

            <label className="grid gap-2 text-sm text-zinc-300">
              <span className="font-medium text-zinc-100">Optional expiry in days</span>
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(inputEvent) => setExpiresInDays(inputEvent.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 outline-none focus:border-emerald-400/60"
                placeholder="e.g. 30"
              />
            </label>

            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {creating ? "Creating album..." : "Create album"}
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Existing albums</h2>
                <p className="text-sm text-zinc-400">
                  {loadingAlbums ? "Loading albums..." : `${albums.length} album${albums.length === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              {isInitialLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="h-4 w-2/5 rounded bg-white/10" />
                      <div className="mt-3 h-3 w-3/5 rounded bg-white/10" />
                      <div className="mt-3 h-3 w-1/2 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : albums.length === 0 ? (
                <div className="px-4 py-10 text-center text-zinc-400">
                  <p className="text-base font-medium text-white">No albums yet</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Create the first album to generate a shareable client link.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {albums.map((album) => {
                    const shareUrl = `${galleryOrigin}/gallery/${album.shareToken}`;

                    return (
                      <div key={album._id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">
                              {album.isPrivate ? "Private" : "Shared"} album
                              {album.hasPassword ? " · password protected" : ""}
                            </p>
                            <p className="text-xs text-zinc-400">
                              Expires: {album.expiresAt ? new Date(album.expiresAt).toLocaleDateString() : "Never"}
                            </p>
                            <p className="break-all text-xs text-zinc-500">{shareUrl}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(shareUrl)}
                            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          {createdAlbum ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-zinc-300">Shareable URL</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={createdAlbum.shareUrl}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
                >
                  Copy link
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Token: {createdAlbum.album.shareToken}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}