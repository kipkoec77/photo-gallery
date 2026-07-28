type DateGroupHeaderProps = {
  dateKey: string;
  count: number;
};

export function DateGroupHeader({ dateKey, count }: DateGroupHeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-100 sm:text-base">
          {dateKey}
        </h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          {count} photo{count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}