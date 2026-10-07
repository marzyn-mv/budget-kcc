"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, ChevronRight, Copy, Check } from "lucide-react";

interface GlCode {
  id: number;
  gl_code: string;
  name_en: string;
  name_dv: string;
  details: string;
}

export default function BudgetCodesPage() {
  const [glCodes, setGlCodes] = useState<GlCode[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GlCode | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (search) params.set("search", search);

    const res = await fetch(`/api/gl-codes/public?${params}`);
    const d = await res.json();
    setGlCodes(d.glCodes || []);
    setTotalPages(d.totalPages || 1);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Budget Codes</h2>
        <p className="text-gray-500">
          GL code reference for Kulhudhuffushi City Council budget items
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        {!loading && (
          <p className="text-xs text-gray-400 mt-2">{total} budget code{total !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-3 text-gray-500 text-sm">Loading budget codes...</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GL Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">English Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Dhivehi Name</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {glCodes.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="hover:bg-gray-50 cursor-pointer group transition"
                  >
                    <td className="px-4 py-3 text-xs text-gray-300 font-medium">
                      #{(page - 1) * 50 + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50">
                        <span className="text-sm font-mono font-semibold text-blue-700">{item.gl_code}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => copyCode(item.gl_code, e)}
                          className="p-0.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition"
                          title="Copy code"
                        >
                          {copied === item.gl_code
                            ? <Check className="w-3 h-3 text-green-600" />
                            : <Copy className="w-3 h-3" />}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-normal break-words">
                      {item.name_en || <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-normal break-words" dir="rtl">
                      {item.name_dv || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {glCodes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {search ? "No budget codes match your search" : "No budget codes available"}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>

                {(() => {
                  const pages: (number | "...")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push("...");
                    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                    if (page < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((p, i) =>
                    p === "..." ? (
                      <span key={`dot-${i}`} className="px-1 text-sm text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[36px] px-2 py-1.5 text-sm rounded-lg transition ${
                          page === p
                            ? "bg-blue-600 text-white font-medium"
                            : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50">
                  <span className="text-base font-mono font-bold text-blue-700">{selected.gl_code}</span>
                  <button
                    onClick={() => copyCode(selected.gl_code)}
                    className="p-0.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition"
                    title="Copy code"
                  >
                    {copied === selected.gl_code
                      ? <Check className="w-3.5 h-3.5 text-green-600" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <h3 className="text-lg font-semibold text-gray-900">Budget Code</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* English Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  English Name
                </label>
                <p className="text-sm text-gray-900">
                  {selected.name_en || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>

              {/* Dhivehi Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Dhivehi Name
                </label>
                <p className="text-base text-gray-900 text-right" dir="rtl">
                  {selected.name_dv || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Details
                </label>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selected.details || <span className="text-gray-400 italic">No details available</span>}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
