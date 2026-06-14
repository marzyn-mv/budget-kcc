"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/Pagination";

interface POItem {
  id: number;
  po_create_date: string;
  gl_code: string;
  po_full: string;
  supplier: string;
  total: number;
  po_remarks: string;
  fund_code: string;
  activity_detail: string;
  center_name: string;
  authorisation: string;
  cancelled: string;
}

export default function POReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    items: POItem[];
    total: number;
    totalAmount: number;
    totalPages: number;
    page: number;
    filters: { funds: string[]; glCodes: string[]; activities: string[] };
  } | null>(null);
  const [search, setSearch] = useState("");
  const [fund, setFund] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDeleteSelected, setShowDeleteSelected] = useState(false);

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/expense", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "po-report" }),
      });
      if (res.ok) {
        setShowDeleteAll(false);
        setDeleteInput("");
        setSelected(new Set());
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/expense", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "po-report", ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        setShowDeleteSelected(false);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", "po-report");
    if (search) params.set("search", search);
    if (fund) params.set("fund", fund);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/expense?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, fund, page, limit]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, search, fund]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "po-report");

    try {
      const res = await fetch("/api/expense/upload", {
        method: "POST",
        body: formData,
      });
      const d = await res.json();
      if (res.ok) {
        setMessage(`Imported ${d.rowsImported} PO records`);
        setFile(null);
        fetchData();
      } else {
        setError(d.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const allIds = data.items.map((i) => i.id);
    const allSelected = allIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const fundColors: Record<string, string> = {
    "J-GOM": "bg-blue-100 text-blue-800",
    "J-LCL": "bg-green-100 text-green-800",
    "L-CWDF": "bg-purple-100 text-purple-800",
    "L-CPAF": "bg-orange-100 text-orange-800",
    "L-CRF": "bg-red-100 text-red-800",
    "L-CTPF": "bg-yellow-100 text-yellow-800",
  };

  const pageAllSelected = data ? data.items.length > 0 && data.items.every((i) => selected.has(i.id)) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin/expense" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Back to Expense
          </a>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">PO Detailed Report</h2>
          {data && (
            <p className="text-sm text-gray-500">
              {data.total} records &middot; Total: MVR {data.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        {data && data.total > 0 && (
          <button
            onClick={() => setShowDeleteAll(true)}
            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            Remove All
          </button>
        )}
      </div>

      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-lg">!</div>
              <h3 className="text-lg font-semibold text-gray-900">Remove All PO Reports</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete all <strong className="text-gray-900">{data?.total}</strong> PO reports and remove them from expense tracking.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteAll(false); setDeleteInput(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteInput !== "DELETE" || deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting ? "Removing..." : "Remove All PO Reports"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <form onSubmit={handleUpload} className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </form>
        {uploading && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Processing file...</p>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                style={{
                  width: "40%",
                  animation: "progress-slide 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <style>{`
              @keyframes progress-slide {
                0% { margin-left: 0; width: 30%; }
                50% { margin-left: 40%; width: 50%; }
                100% { margin-left: 0; width: 30%; }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search activities, suppliers, GL codes..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <select
          value={fund}
          onChange={(e) => { setFund(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Funds</option>
          {data?.filters.funds.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selected.size} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition"
          >
            Deselect All
          </button>
          <button
            onClick={() => setShowDeleteSelected(true)}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete Selected ({selected.size})
          </button>
        </div>
      )}

      {/* Confirm delete selected modal */}
      {showDeleteSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-lg">!</div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Selected PO Reports</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete <strong className="text-gray-900">{selected.size}</strong> selected PO report{selected.size !== 1 ? "s" : ""}? This will also remove them from expense tracking.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteSelected(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting ? "Deleting..." : `Delete ${selected.size} Report${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data?.items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border p-4 transition ${
                  selected.has(item.id) ? "border-blue-400 bg-blue-50/50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${fundColors[item.fund_code] || "bg-gray-100 text-gray-800"}`}>
                          {item.fund_code}
                        </span>
                        <span className="text-xs text-gray-400">{item.po_create_date}</span>
                      </div>
                      <span className="text-base font-mono font-bold text-gray-900">
                        {Number(item.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{item.supplier}</p>
                    <p className="text-xs text-gray-500 mb-2">{item.po_remarks}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span><span className="text-gray-400">PO:</span> <span className="font-mono">{item.po_full}</span></span>
                      <span><span className="text-gray-400">GL:</span> <span className="font-mono">{item.gl_code}</span></span>
                      <span><span className="text-gray-400">Activity:</span> {item.activity_detail}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fund</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GL Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.items.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition ${selected.has(item.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.po_create_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">{item.po_full}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${fundColors[item.fund_code] || "bg-gray-100 text-gray-800"}`}>
                        {item.fund_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.gl_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{item.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{item.activity_detail}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[250px] truncate">{item.po_remarks}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono font-medium whitespace-nowrap">
                      {Number(item.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.items.length === 0 && (
              <div className="text-center py-12 text-gray-500">No PO records found</div>
            )}
          </div>

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              limit={limit}
              total={data.total}
              onPageChange={setPage}
              onLimitChange={(val) => { setLimit(val); setPage(1); }}
            />
          )}
        </>
      )}
    </div>
  );
}
