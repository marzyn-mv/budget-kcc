"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Copy, Check } from "lucide-react";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Budget GL Codes</h2>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">{total} code{total !== 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search codes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-solid border-blue-600 border-r-transparent" />
          <p className="mt-3 text-gray-400 text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="pl-5 pr-2 py-2.5 text-left text-xs font-medium text-gray-500 w-12">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-32">Code</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">English Name</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 pr-5">Dhivehi Name</th>
                </tr>
              </thead>
              <tbody>
                {glCodes.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="pl-5 pr-2 py-3 text-xs text-gray-400 tabular-nums">
                      {(page - 1) * 50 + index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <code className="text-[13px] font-semibold text-gray-900 font-mono">{item.gl_code}</code>
                        <button
                          onClick={(e) => copyCode(item.gl_code, e)}
                          className="p-0.5 rounded text-gray-300 hover:text-blue-600 transition"
                          title="Copy code"
                        >
                          {copied === item.gl_code
                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                            : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {item.name_en || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right pr-5" dir="rtl">
                      {item.name_dv || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
                {glCodes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-sm text-gray-400">
                      {search ? "No results found" : "No budget codes available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                        <span key={`dot-${i}`} className="px-1.5 text-sm text-gray-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-[34px] px-2 py-1.5 text-sm rounded-md transition ${
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
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
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

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">English Name</label>
                <p className="text-sm text-gray-900">
                  {selected.name_en || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Dhivehi Name</label>
                <p className="text-base text-gray-900 text-right" dir="rtl">
                  {selected.name_dv || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Details</label>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selected.details || <span className="text-gray-400 italic">No details available</span>}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
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
