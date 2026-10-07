"use client";

interface Props {
  search: string;
  fund: string;
  center: string;
  section: string;
  funds: string[];
  centers: string[];
  sections: string[];
  onSearchChange: (val: string) => void;
  onFundChange: (val: string) => void;
  onCenterChange: (val: string) => void;
  onSectionChange: (val: string) => void;
}

export default function SearchFilters({
  search,
  fund,
  center,
  section,
  funds,
  centers,
  sections,
  onSearchChange,
  onFundChange,
  onCenterChange,
  onSectionChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="sm:col-span-2 lg:col-span-1">
        <input
          type="text"
          placeholder="Search activities, GL codes..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] dark:placeholder-[#9BA1A6]"
        />
      </div>
      <select
        value={fund}
        onChange={(e) => onFundChange(e.target.value)}
        aria-label="Filter by fund"
        className="select-styled w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] cursor-pointer"
      >
        <option value="">All Funds</option>
        {funds.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        value={section}
        onChange={(e) => onSectionChange(e.target.value)}
        aria-label="Filter by section"
        className="select-styled w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] cursor-pointer"
      >
        <option value="">All Sections</option>
        {sections.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={center}
        onChange={(e) => onCenterChange(e.target.value)}
        aria-label="Filter by center"
        className="select-styled w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] cursor-pointer"
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
