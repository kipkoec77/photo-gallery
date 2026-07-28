type LocationFilterProps = {
  locations: string[];
  value: string;
  onChange: (value: string) => void;
};

export function LocationFilter({ locations, value, onChange }: LocationFilterProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300 sm:max-w-xs">
      <span className="font-medium text-zinc-100">Filter by location</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-emerald-400/60"
      >
        <option value="">All locations</option>
        {locations.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </select>
    </label>
  );
}