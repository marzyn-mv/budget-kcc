"use client";

interface Props {
  totalBudget: number;
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
  totalItems,
  filteredBudget,
  filteredItems,
}: Props) {
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Budget Items</p>
        <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        <p className="text-xs text-gray-400 mt-1">Total line items</p>
      </div>
      {showFiltered && (
        <>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm">
            <p className="text-sm text-blue-600 mb-1">Filtered Budget</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatMVR(filteredBudget!)}
            </p>
            <p className="text-xs text-blue-400 mt-1">MVR</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm">
            <p className="text-sm text-blue-600 mb-1">Filtered Items</p>
            <p className="text-2xl font-bold text-blue-900">
              {filteredItems}
            </p>
            <p className="text-xs text-blue-400 mt-1">Matching results</p>
          </div>
        </>
      )}
    </div>
  );
}
