"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  search: string;
  fund: string;
  center: string;
  selectedSections: string[];
  funds: string[];
  centers: string[];
  sections: string[];
  onSearchChange: (val: string) => void;
  onFundChange: (val: string) => void;
  onCenterChange: (val: string) => void;
  onSectionChange: (val: string[]) => void;
}

function MultiSelect({
  selected,
  options,
  onChange,
  label,
  allLabel,
}: {
  selected: string[];
  options: string[];
  onChange: (val: string[]) => void;
  label: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayText =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? selected[0]
        : `${selected.length} ${label}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="select-styled w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] cursor-pointer text-left"
      >
        <span className="block truncate">{displayText}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 dark:border-[#3A3F44] bg-white dark:bg-[#1D1F20] shadow-lg">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-[#262A2E] border-b border-gray-200 dark:border-[#3A3F44]"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262A2E] dark:text-[#E4E6E7]"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-gray-300 dark:border-[#3A3F44] text-blue-600 focus:ring-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchFilters({
  search,
  fund,
  center,
  selectedSections,
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
      <MultiSelect
        selected={selectedSections}
        options={sections}
        onChange={onSectionChange}
        label="Sections"
        allLabel="All Sections"
      />
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
