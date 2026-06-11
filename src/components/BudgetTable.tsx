"use client";

import { BudgetItem } from "@/lib/types";

interface Props {
  items: BudgetItem[];
  onEdit?: (item: BudgetItem) => void;
  isAdmin?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export default function BudgetTable({
  items,
  onEdit,
  isAdmin,
  selectedIds,
  onSelectionChange,
}: Props) {
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
    "J-GOM": "bg-blue-100 text-blue-800",
    "J-LCL": "bg-green-100 text-green-800",
    "L-CWDF": "bg-purple-100 text-purple-800",
    "L-CPAF": "bg-orange-100 text-orange-800",
    "L-CRF": "bg-red-100 text-red-800",
    "L-CTPF": "bg-yellow-100 text-yellow-800",
  };

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
            <span className="text-sm text-gray-600">Select all</span>
          </label>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`bg-white rounded-lg border p-4 transition-colors ${
              selectedIds?.has(item.id)
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {isAdmin && onSelectionChange && (
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(item.id) || false}
                    onChange={() => toggleOne(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                )}
                <span className="text-xs text-gray-400">#{idx + 1}</span>
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${fundColors[item.fund] || "bg-gray-100 text-gray-800"}`}
                >
                  {item.fund}
                </span>
              </div>
              <span className="text-base font-mono font-bold text-gray-900">
                {item.budget}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-2">
              {item.activity_detail}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                <span className="text-gray-400">Prog:</span>{" "}
                <span className="font-mono">{item.prog}</span>
              </span>
              <span>
                <span className="text-gray-400">GL:</span>{" "}
                <span className="font-mono">{item.gl_code}</span>
              </span>
              <span>
                <span className="text-gray-400">Center:</span> {item.center_name}
              </span>
            </div>
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No budget items found
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isAdmin && onSelectionChange && (
                <th className="px-4 py-3 text-center w-10">
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Fund
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Program Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Center
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                GL Code
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Budget (MVR)
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`transition-colors ${
                  selectedIds?.has(item.id)
                    ? "bg-blue-50 hover:bg-blue-100"
                    : "hover:bg-gray-50"
                }`}
              >
                {isAdmin && onSelectionChange && (
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(item.id) || false}
                      onChange={() => toggleOne(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${fundColors[item.fund] || "bg-gray-100 text-gray-800"}`}
                  >
                    {item.fund}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                  {item.activity_detail}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {item.prog}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.center_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {item.gl_code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono font-medium">
                  {item.budget}
                </td>
                {isAdmin && onEdit && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No budget items found
          </div>
        )}
      </div>
    </>
  );
}
