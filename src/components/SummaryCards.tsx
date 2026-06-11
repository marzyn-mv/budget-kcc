"use client";

interface Props {
  totalBudget: number;
  totalSpent: number;
  totalItems: number;
  filteredBudget?: number;
  filteredItems?: number;
}

function formatMVR(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function SummaryCards({
  totalBudget,
  totalSpent,
  totalItems,
  filteredBudget,
  filteredItems,
}: Props) {
  const spent = totalSpent || 0;
  const totalRemaining = totalBudget - spent;
  const showFiltered =
    filteredBudget !== undefined && filteredBudget !== totalBudget;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Total Budget</p>
        <p className="text-2xl font-bold text-gray-900">
          {formatMVR(totalBudget)}
        </p>
        <p className="text-xs text-gray-400 mt-1">MVR</p>
      </div>
      <div className={`rounded-xl border p-5 shadow-sm ${totalRemaining >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className={`text-sm mb-1 ${totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>Total Remaining</p>
        <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-900" : "text-red-900"}`}>
          {formatMVR(totalRemaining)}
        </p>
        <p className={`text-xs mt-1 ${totalRemaining >= 0 ? "text-green-400" : "text-red-400"}`}>
          {formatMVR(spent)} spent
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Budget Items</p>
        <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        <p className="text-xs text-gray-400 mt-1">Total line items</p>
      </div>
      {showFiltered && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm">
          <p className="text-sm text-blue-600 mb-1">Filtered Budget</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatMVR(filteredBudget!)}
          </p>
          <p className="text-xs text-blue-400 mt-1">{filteredItems} items</p>
        </div>
      )}
    </div>
  );
}
