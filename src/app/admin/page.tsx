"use client";

import { useState, useEffect, useCallback } from "react";
import SearchFilters from "@/components/SearchFilters";
import BudgetTable from "@/components/BudgetTable";
import EditModal from "@/components/EditModal";
import Pagination from "@/components/Pagination";
import { BudgetItem } from "@/lib/types";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [loginError, setLoginError] = useState("");

  const [data, setData] = useState<{
    items: BudgetItem[];
    total: number;
    totalPages: number;
    page: number;
    filters: { funds: string[]; centers: string[] };
  } | null>(null);

  const [search, setSearch] = useState("");
  const [fund, setFund] = useState("");
  const [center, setCenter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      });
  }, []);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fund) params.set("fund", fund);
    if (center) params.set("center", center);
    params.set("page", String(page));
    params.set("limit", limit === 0 ? "10000" : String(limit));

    const res = await fetch(`/api/budget?${params}`);
    const json = await res.json();
    setData(json);
  }, [search, fund, center, page, limit]);

  useEffect(() => {
    if (authenticated) {
      const timer = setTimeout(fetchData, 300);
      return () => clearTimeout(timer);
    }
  }, [authenticated, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setLoginError("Invalid access code");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
  };

  const handleEdit = async (
    updated: Partial<BudgetItem> & { id: number }
  ) => {
    const res = await fetch("/api/budget/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      setEditItem(null);
      fetchData();
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter access code to continue
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            {loginError && (
              <p className="text-red-500 text-sm mb-3">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-500">Manage budget data</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
          >
            Expense
          </a>
          <a
            href="/admin/upload"
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            Upload Excel
          </a>
          <a
            href="/admin/uploads"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Uploads
          </a>
          <a
            href="/admin/logs"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
          >
            View Logs
          </a>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6">
        <SearchFilters
          search={search}
          fund={fund}
          center={center}
          funds={data?.filters.funds || []}
          centers={data?.filters.centers || []}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onFundChange={(v) => {
            setFund(v);
            setPage(1);
          }}
          onCenterChange={(v) => {
            setCenter(v);
            setPage(1);
          }}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-800 font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
          >
            Clear selection
          </button>
        </div>
      )}

      <BudgetTable
        items={data?.items || []}
        isAdmin
        onEdit={setEditItem}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          limit={limit}
          total={data.total}
          onPageChange={setPage}
          onLimitChange={(val) => {
            setLimit(val);
            setPage(1);
          }}
        />
      )}

      {editItem && (
        <EditModal
          item={editItem}
          onSave={handleEdit}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
