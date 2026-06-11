"use client";

export default function ExpensePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Expense</h2>
        <p className="text-gray-500">
          Upload and manage expense reports
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/admin/expense/po-report"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-lg mb-3">
            📋
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            PO Detailed Report
          </h3>
          <p className="text-sm text-gray-500">
            Upload and view Purchase Order detailed reports
          </p>
        </a>

        <a
          href="/admin/expense/voucher-report"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 text-lg mb-3">
            🧾
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Voucher Detailed Report
          </h3>
          <p className="text-sm text-gray-500">
            Upload and view Voucher detailed reports
          </p>
        </a>
      </div>
    </div>
  );
}
