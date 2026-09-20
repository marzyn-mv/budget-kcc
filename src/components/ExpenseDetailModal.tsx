"use client";

import { useState, useEffect } from "react";
import { BudgetItem } from "@/lib/types";

interface ExpenseData {
  poTotal: number;
  voucherTotal: number;
  acrTotal: number;
  bcNet: number;
  totalExpense: number;
  poItems: {
    id: number;
    po_create_date: string;
    po_full: string;
    supplier: string;
    total: number;
    po_remarks: string;
    cancelled: string;
  }[];
  voucherItems: {
    id: number;
    produce_date: string;
    voucher_full: string;
    supplier: string;
    voucher_type: string;
    total: number;
    reason: string;
    cancelled: string;
    cheque_no: string;
  }[];
  acrItems: {
    id: number;
    produce_date: string;
    voucher_full: string;
    total: number;
    remarks: string;
    cancelled: string;
  }[];
  bcItems: {
    id: number;
    budget_control_date: string;
    budget_control_no: string;
    amount: number;
    side: string;
    effect: number;
    cr_activity: string;
    dr_activity: string;
    cr_gl_code: string;
    dr_gl_code: string;
  }[];
}

interface Props {
  item: BudgetItem;
  onClose: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function ExpenseDetailModal({ item, onClose }: Props) {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"po" | "voucher" | "acr" | "bc">("po");

  useEffect(() => {
    const params = new URLSearchParams({
      gl_code: item.gl_code,
      activity: item.activity_detail,
      fund: item.fund,
    });
    fetch(`/api/budget/expenses?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [item]);

  const budgetNum = parseFloat(String(item.budget).replace(/[, ]/g, "")) || 0;
  const effectiveBudget = data ? budgetNum + (data.bcNet || 0) : budgetNum;
  const remaining = data ? effectiveBudget - data.totalExpense : budgetNum;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {item.activity_detail}
            </h3>
            <div className="flex gap-3 mt-1 text-sm text-gray-500">
              <span>Fund: <span className="font-mono">{item.fund}</span></span>
              <span>GL: <span className="font-mono">{item.gl_code}</span></span>
              <span>Center: {item.center_name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-gray-50 grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">Approved Budget</p>
            <p className="text-sm font-bold text-gray-900">{fmt(budgetNum)}</p>
            {!loading && data && data.bcNet !== 0 && (
              <p className={`text-[10px] font-medium ${data.bcNet > 0 ? "text-teal-600" : "text-red-500"}`}>
                BC: {data.bcNet > 0 ? "+" : ""}{fmt(data.bcNet)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">PO Spent</p>
            <p className="text-sm font-bold text-blue-600">
              {loading ? "..." : fmt(data?.poTotal ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Voucher Spent</p>
            <p className="text-sm font-bold text-purple-600">
              {loading ? "..." : fmt(data?.voucherTotal ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ACR Spent</p>
            <p className="text-sm font-bold text-orange-600">
              {loading ? "..." : fmt(data?.acrTotal ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Effective Budget</p>
            <p className="text-sm font-bold text-gray-900">
              {loading ? "..." : fmt(effectiveBudget)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Remaining</p>
            <p
              className={`text-sm font-bold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {loading ? "..." : fmt(remaining)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab("po")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border border-b-0 transition ${
              tab === "po"
                ? "bg-white text-blue-600 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Purchase Orders ({data?.poItems.length ?? 0})
          </button>
          <button
            onClick={() => setTab("voucher")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border border-b-0 transition ${
              tab === "voucher"
                ? "bg-white text-purple-600 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Vouchers ({data?.voucherItems.length ?? 0})
          </button>
          <button
            onClick={() => setTab("acr")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border border-b-0 transition ${
              tab === "acr"
                ? "bg-white text-orange-600 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            ACR ({data?.acrItems.length ?? 0})
          </button>
          <button
            onClick={() => setTab("bc")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border border-b-0 transition ${
              tab === "bc"
                ? "bg-white text-teal-600 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Budget Control ({data?.bcItems.length ?? 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
              <p className="mt-2 text-sm text-gray-500">Loading expenses...</p>
            </div>
          ) : tab === "po" ? (
            data && data.poItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">PO #</th>
                      <th className="pb-2 pr-3">Supplier</th>
                      <th className="pb-2 pr-3 text-right">Amount</th>
                      <th className="pb-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.poItems.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                          {po.po_create_date}
                        </td>
                        <td className="py-2 pr-3 font-mono text-gray-900">
                          {po.po_full}
                        </td>
                        <td className="py-2 pr-3 text-gray-700 max-w-[200px] truncate">
                          {po.supplier}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono font-medium text-gray-900">
                          {fmt(Number(po.total))}
                        </td>
                        <td className="py-2 pr-3">
                          {po.cancelled === "X" ? (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              Cancelled
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No purchase orders found
              </p>
            )
          ) : tab === "voucher" ? (
            data && data.voucherItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Voucher #</th>
                    <th className="pb-2 pr-3">Supplier</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.voucherItems.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                        {v.produce_date}
                      </td>
                      <td className="py-2 pr-3 font-mono text-gray-900">
                        {v.voucher_full}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 max-w-[200px] truncate">
                        {v.supplier}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{v.voucher_type}</td>
                      <td className="py-2 pr-3 text-right font-mono font-medium text-gray-900">
                        {fmt(Number(v.total))}
                      </td>
                      <td className="py-2 pr-3">
                        {v.cancelled === "X" ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No vouchers found
            </p>
          )) : tab === "acr" ? (
            data && data.acrItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Voucher #</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2 pr-3">Remarks</th>
                    <th className="pb-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.acrItems.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                        {a.produce_date}
                      </td>
                      <td className="py-2 pr-3 font-mono text-gray-900">
                        {a.voucher_full}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono font-medium text-gray-900">
                        {fmt(Number(a.total))}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 max-w-[200px] truncate">
                        {a.remarks}
                      </td>
                      <td className="py-2 pr-3">
                        {a.cancelled === "X" ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No ACR records found
            </p>
          )) : data && data.bcItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">BC No</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2 pr-3 text-right">Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.bcItems.map((bc) => (
                    <tr key={bc.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                        {bc.budget_control_date}
                      </td>
                      <td className="py-2 pr-3 font-mono text-gray-900">
                        {bc.budget_control_no}
                      </td>
                      <td className="py-2 pr-3">
                        {bc.side === "credit" ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Credit (+)
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Debit (-)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono font-medium text-gray-900">
                        {fmt(Number(bc.amount))}
                      </td>
                      <td className={`py-2 pr-3 text-right font-mono font-medium ${bc.effect > 0 ? "text-green-600" : "text-red-600"}`}>
                        {bc.effect > 0 ? "+" : ""}{fmt(bc.effect)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="py-2 pr-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Effect</td>
                    <td className={`py-2 pr-3 text-right font-mono font-bold ${(data.bcNet || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {(data.bcNet || 0) > 0 ? "+" : ""}{fmt(data.bcNet || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No budget control records found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
