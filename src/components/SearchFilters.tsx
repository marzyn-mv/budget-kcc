"use client";

interface Props {
  search: string;
  fund: string;
  center: string;
  funds: string[];
  centers: string[];
  onSearchChange: (val: string) => void;
  onFundChange: (val: string) => void;
  onCenterChange: (val: string) => void;
}

export default function SearchFilters({
  search,
  fund,
  center,
  funds,
  centers,
  onSearchChange,
  onFundChange,
  onCenterChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search activities, program codes, GL codes..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
        />
      </div>
      <select
        value={fund}
        onChange={(e) => onFundChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white"
      >
        <option value="">All Funds</option>
        {funds.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        value={center}
        onChange={(e) => onCenterChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white"
      >
        <option value="">All Centers</option>
        {centers.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
