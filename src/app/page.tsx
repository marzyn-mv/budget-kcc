"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchFilters from "@/components/SearchFilters";
import BudgetTable from "@/components/BudgetTable";
import SummaryCards from "@/components/SummaryCards";
import Pagination from "@/components/Pagination";
import ExpenseDetailModal from "@/components/ExpenseDetailModal";
import { BudgetItem } from "@/lib/types";

interface SummaryData {
  totalItems: number;
  totalBudget: number;
  totalSpent: number;
  byFund: { fund: string; total: number; count: number }[];
  byCenter: { center: string; total: number; count: number }[];
}

interface BudgetResponse {
  items: BudgetItem[];
  total: number;
  totalBudget: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    funds: string[];
    centers: string[];
  };
  summary: SummaryData;
}

export default function HomePage() {
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [search, setSearch] = useState("");
  const [fund, setFund] = useState("");
  const [center, setCenter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fund) params.set("fund", fund);
    if (center) params.set("center", center);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/budget?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, fund, center, page, limit]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchData();
      return;
    }
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleFundChange = (val: string) => {
    setFund(val);
    setPage(1);
  };

  const handleCenterChange = (val: string) => {
    setCenter(val);
    setPage(1);
  };

  const summary = data?.summary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Budget Overview
          </h2>
          <p className="text-gray-500">
            Explore the approved budget allocation for Kulhudhuffushi City Council
            2026
          </p>
        </div>
      </div>

      <div className="mb-6">
        {summary ? (
          <SummaryCards
            totalBudget={summary.totalBudget}
            totalSpent={summary.totalSpent}
            totalItems={summary.totalItems}
            filteredBudget={data?.totalBudget}
            filteredItems={data?.total}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-7 bg-gray-200 rounded w-36 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-16 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fund breakdown */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summary ? (
          summary.byFund.map((f) => (
            <button
              key={f.fund}
              onClick={() => handleFundChange(fund === f.fund ? "" : f.fund)}
              className={`p-3 rounded-lg border text-left transition ${
                fund === f.fund
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-xs font-medium text-gray-500">{f.fund}</p>
              <p className="text-sm font-bold text-gray-900">
                {new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(f.total)}
              </p>
              <p className="text-xs text-gray-500">{f.count} items</p>
            </button>
          ))
        ) : (
          [...Array(6)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-200 bg-white animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-12 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-14" />
            </div>
          ))
        )}
      </div>

      <div className="mb-6">
        <SearchFilters
          search={search}
          fund={fund}
          center={center}
          funds={data?.filters.funds || []}
          centers={data?.filters.centers || []}
          onSearchChange={handleSearchChange}
          onFundChange={handleFundChange}
          onCenterChange={handleCenterChange}
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-3 text-gray-500">Loading budget data...</p>
        </div>
      ) : (
        <>
          <div className="mb-3 text-sm text-gray-500">
            Showing {data?.items.length} of {data?.total} items
          </div>
          <BudgetTable items={data?.items || []} onItemClick={setSelectedItem} />
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
        </>
      )}
      {selectedItem && (
        <ExpenseDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
