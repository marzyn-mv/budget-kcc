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
      <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">Total Budget</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">
          {formatMVR(totalBudget)}
        </p>
        <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">MVR</p>
      </div>
      <div className={`rounded-xl border p-5 shadow-sm ${totalRemaining >= 0 ? "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/50" : "bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/50"}`}>
        <p className={`text-sm mb-1 ${totalRemaining >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>Total Remaining</p>
        <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300"}`}>
          {formatMVR(totalRemaining)}
        </p>
        <p className={`text-xs mt-1 ${totalRemaining >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {formatMVR(spent)} spent
        </p>
      </div>
      <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">Budget Items</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">{totalItems}</p>
        <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">Total line items</p>
      </div>
      {showFiltered && (
        <div className="bg-blue-50 dark:bg-blue-900/15 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5 shadow-sm">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Filtered Budget</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
            {formatMVR(filteredBudget!)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{filteredItems} items</p>
        </div>
      )}
    </div>
  );
}
