"use client";

import { useEffect, useRef, useState } from "react";
import { BudgetItem } from "@/lib/types";

function GlTooltip({ code, name }: { code: string; name?: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    if (!name) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShow(true);
  };

  return (
    <span
      ref={ref}
      className="relative cursor-default underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-2"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {code}
      {show && name && pos && (
        <span
          className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
          style={{ left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <span className="block max-w-72 px-3 py-2 rounded-lg bg-gray-900 dark:bg-[#2A2E33] text-white dark:text-[#E4E6E7] text-xs leading-relaxed shadow-lg border border-gray-700 dark:border-[#3A3F44]">
            <span className="block font-mono text-[10px] text-gray-400 dark:text-[#7A8086] mb-1 ltr">{code}</span>
            <span className="block font-medium text-sm leading-snug" dir="rtl" style={{ fontFamily: "var(--font-dhivehi)" }}>{name}</span>
          </span>
          <span className="block w-2 h-2 mx-auto -mt-[3px] rotate-45 bg-gray-900 dark:bg-[#2A2E33] border-r border-b border-gray-700 dark:border-[#3A3F44]" />
        </span>
      )}
    </span>
  );
}

interface Props {
  items: BudgetItem[];
  onEdit?: (item: BudgetItem) => void;
  onItemClick?: (item: BudgetItem) => void;
  isAdmin?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

function parseBudget(val: string | number): number {
  return parseFloat(String(val).replace(/[, ]/g, "")) || 0;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function BudgetTable({
  items,
  onEdit,
  onItemClick,
  isAdmin,
  selectedIds,
  onSelectionChange,
}: Props) {
  const [glNames, setGlNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/gl-codes/public?limit=9999")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const g of data.glCodes || []) {
          map[g.gl_code] = g.name_en || g.name_dv || "";
        }
        setGlNames(map);
      })
      .catch(() => {});
  }, []);

  const allSelected =
    items.length > 0 && selectedIds ? items.every((i) => selectedIds.has(i.id)) : false;
  const someSelected =
    selectedIds ? items.some((i) => selectedIds.has(i.id)) && !allSelected : false;

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      items.forEach((i) => next.delete(i.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      items.forEach((i) => next.add(i.id));
      onSelectionChange(next);
    }
  };

  const toggleOne = (id: number) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };
  const fundColors: Record<string, string> = {
    "J-GOM": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "J-LCL": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "L-CWDF": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "L-CPAF": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "L-CRF": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "L-CTPF": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  };

  const showExpenses = !!onItemClick;

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isAdmin && onSelectionChange && items.length > 0 && (
          <label className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-[#9BA1A6]">Select all</span>
          </label>
        )}
        {items.map((item, idx) => {
          const budget = parseBudget(item.budget) + (item.budget_control || 0);
          const spent = (item.po_spent || 0) + (item.voucher_spent || 0) + (item.acr_spent || 0);
          const remaining = budget - spent;

          return (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className={`bg-white dark:bg-[#1D1F20] rounded-lg border p-4 transition-colors ${
                selectedIds?.has(item.id)
                  ? "border-blue-300 bg-blue-50 dark:bg-blue-900/15"
                  : "border-gray-200 dark:border-[#3A3F44]"
              } ${onItemClick ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-500" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isAdmin && onSelectionChange && (
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(item.id) || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleOne(item.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                  <span className="text-xs text-gray-500 dark:text-[#9BA1A6]">#{idx + 1}</span>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${fundColors[item.fund] || "bg-gray-100 text-gray-800 dark:bg-[#262A2E] dark:text-[#C1C5C9]"}`}
                  >
                    {item.fund}
                  </span>
                </div>
                <span className="text-base font-mono font-bold text-gray-900 dark:text-[#E4E6E7]">
                  {fmt(parseBudget(item.budget))}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-[#E4E6E7] mb-2">
                {item.activity_detail}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-[#9BA1A6]">
                <span>
                  <span>Prog:</span>{" "}
                  <span className="font-mono">{item.prog}</span>
                </span>
                {item.section && (
                  <span>
                    <span>Section:</span>{" "}
                    <span className="font-medium text-gray-700 dark:text-[#C1C5C9]">{item.section}</span>
                  </span>
                )}
                <span>
                  <span>GL:</span>{" "}
                  <span className="font-mono">
                    <GlTooltip code={item.gl_code} name={glNames[item.gl_code]} />
                  </span>
                </span>
              </div>
              {showExpenses && (
                <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-[#3A3F44] text-xs">
                  <span className="text-gray-500 dark:text-[#9BA1A6]">
                    Spent: <span className="font-mono font-medium text-gray-700 dark:text-[#C1C5C9]">{fmt(spent)}</span>
                  </span>
                  <span className={remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    Remaining: <span className="font-mono font-medium">{fmt(remaining)}</span>
                  </span>
                </div>
              )}
              {isAdmin && onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  className="mt-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-[#9BA1A6]">
            No budget items found
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-[#3A3F44]">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-[#3A3F44]">
          <colgroup>
            {isAdmin && onSelectionChange && <col className="w-10" />}
            <col className="w-10" />
            <col className="w-20" />
            <col />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-28" />
            {showExpenses && (
              <>
                <col className="w-28" />
                <col className="w-28" />
              </>
            )}
            {isAdmin && <col className="w-20" />}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-[#262A2E]">
            <tr>
              {isAdmin && onSelectionChange && (
                <th className="px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                #
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                Fund
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                Activity
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                Activity No
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                Section
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                GL
              </th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                Budget
              </th>
              {showExpenses && (
                <>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                    Spent
                  </th>
                  <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                    Remaining
                  </th>
                </>
              )}
              {isAdmin && (
                <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1D1F20] divide-y divide-gray-200 dark:divide-[#3A3F44]">
            {items.map((item, idx) => {
              const budget = parseBudget(item.budget) + (item.budget_control || 0);
              const spent = (item.po_spent || 0) + (item.voucher_spent || 0) + (item.acr_spent || 0);
              const remaining = budget - spent;

              return (
                <tr
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={`transition-colors ${
                    selectedIds?.has(item.id)
                      ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/15 dark:hover:bg-blue-900/25"
                      : "hover:bg-gray-50 dark:hover:bg-[#262A2E]"
                  } ${onItemClick ? "cursor-pointer" : ""}`}
                >
                  {isAdmin && onSelectionChange && (
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(item.id) || false}
                        onChange={() => toggleOne(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-2 py-2.5 text-xs text-gray-500 dark:text-[#9BA1A6]">{idx + 1}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${fundColors[item.fund] || "bg-gray-100 text-gray-800 dark:bg-[#262A2E] dark:text-[#C1C5C9]"}`}
                    >
                      {item.fund}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-sm text-gray-900 dark:text-[#E4E6E7] truncate" title={item.activity_detail}>
                    {item.activity_detail}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-gray-600 dark:text-[#9BA1A6] font-mono truncate">
                    {item.prog}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-gray-600 dark:text-[#9BA1A6] truncate" title={item.section}>
                    {item.section}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-gray-600 dark:text-[#9BA1A6] font-mono">
                    <GlTooltip code={item.gl_code} name={glNames[item.gl_code]} />
                  </td>
                  <td className="px-2 py-2.5 text-sm text-gray-900 dark:text-[#E4E6E7] text-right font-mono font-medium">
                    {fmt(parseBudget(item.budget))}
                  </td>
                  {showExpenses && (
                    <>
                      <td className="px-2 py-2.5 text-sm text-right font-mono font-medium text-gray-700 dark:text-[#C1C5C9]">
                        {fmt(spent)}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-sm text-right font-mono font-medium ${
                          remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {fmt(remaining)}
                      </td>
                    </>
                  )}
                  {isAdmin && onEdit && (
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-[#9BA1A6]">
            No budget items found
          </div>
        )}
      </div>
    </>
  );
}
