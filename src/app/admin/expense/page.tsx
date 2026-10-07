"use client";

import { ClipboardList, Receipt, FileText } from "lucide-react";

export default function ExpensePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7] mb-2">Expense</h2>
        <p className="text-gray-500 dark:text-[#9BA1A6]">
          Upload and manage expense reports
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/admin/expense/po-report"
          className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-6 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-300 mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7] mb-1">
            PO Detailed Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6]">
            Upload and view Purchase Order detailed reports
          </p>
        </a>

        <a
          href="/admin/expense/voucher-report"
          className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-6 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-700 dark:text-purple-300 mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7] mb-1">
            Voucher Detailed Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6]">
            Upload and view Voucher detailed reports
          </p>
        </a>
        <a
          href="/admin/expense/acr-report"
          className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-6 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-700 dark:text-orange-300 mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7] mb-1">
            ACR Detail Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6]">
            Upload and view ACR detailed reports
          </p>
        </a>
      </div>
    </div>
  );
}
