"use client";

import { useState, useEffect, useCallback } from "react";
import SearchFilters from "@/components/SearchFilters";
import BudgetTable from "@/components/BudgetTable";
import EditModal from "@/components/EditModal";
import Pagination from "@/components/Pagination";
import { BudgetItem } from "@/lib/types";

export default function AdminPage() {
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

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fund) params.set("fund", fund);
    if (center) params.set("center", center);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/budget?${params}`);
    const json = await res.json();
    setData(json);
  }, [search, fund, center, page, limit]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-500">Manage budget data</p>
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
