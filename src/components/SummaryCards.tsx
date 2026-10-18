"use client";

interface Props {
  totalBudget: number;
  totalSpent: number;
  totalAcr: number;
  totalItems: number;
  totalBcNet?: number;
  columnBudgetTotal?: number;
  filteredBudget?: number;
  filteredItems?: number;
  isFiltered?: boolean;
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
  totalAcr,
  totalItems,
  totalBcNet = 0,
  columnBudgetTotal,
  filteredBudget,
  filteredItems,
  isFiltered = false,
}: Props) {
  const effectiveBudget = totalBudget;
  const spent = totalSpent || 0;
  const totalRemaining = effectiveBudget - spent;
  const showFiltered = isFiltered && filteredBudget !== undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">Budget</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">
          {formatMVR(effectiveBudget)}
        </p>
        {totalBcNet !== 0 ? (
          <p className={`text-xs mt-1 ${totalBcNet > 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500 dark:text-red-400"}`}>
            Approved {formatMVR(totalBudget)} | BC: {totalBcNet > 0 ? "+" : ""}{formatMVR(totalBcNet)}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">Available Budget</p>
        )}
      </div>
      <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">Spent</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">
          {formatMVR(spent)}
        </p>
        <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">PO + Other PV</p>
      </div>
      <div className={`rounded-xl border p-5 shadow-sm ${totalRemaining >= 0 ? "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/50" : "bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/50"}`}>
        <p className={`text-sm mb-1 ${totalRemaining >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>Remaining</p>
        <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300"}`}>
          {formatMVR(totalRemaining)}
        </p>
        <p className={`text-xs mt-1 ${totalRemaining >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {totalBcNet !== 0 ? "(Budget + BC) - Spent" : "Budget - Spent"}
        </p>
      </div>
      <div className="bg-orange-50 dark:bg-orange-900/15 rounded-xl border border-orange-200 dark:border-orange-800/50 p-5 shadow-sm">
        <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">Reserved Balance</p>
        <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
          {formatMVR(totalAcr)}
        </p>
        <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">ACR total</p>
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
