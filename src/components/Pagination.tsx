"use client";

interface Props {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [25, 50, 75, 100, 0]; // 0 = All

export default function Pagination({
  page,
  totalPages,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: Props) {
  return (
    <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Show:</span>
        {LIMIT_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onLimitChange(opt)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              (opt === 0 && limit >= total) || limit === opt
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt === 0 ? "All" : opt}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
