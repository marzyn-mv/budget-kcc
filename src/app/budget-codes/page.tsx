"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, Copy, Check, ChevronDown } from "lucide-react";

/** GL code classification by first 3 digits — from GL_Code_Classification_Reference */
const GL_CLASSIFICATIONS: Record<string, string> = {
  "211": "Salaries and Overtime",
  "212": "Employee Allowances and Other Payments",
  "213": "Pensions and Retirement Benefits",
  "221": "Travel Expenses",
  "222": "Office Supplies and Consumables",
  "223": "Operating Services and Utilities",
  "224": "Operational Supplies and Consumables",
  "225": "Training and Human Resource Development",
  "226": "Repairs and Maintenance",
  "227": "Interest and Debt Service Charges",
  "228": "Subsidies, Grants and Financial Assistance",
  "281": "Losses and Compensation",
  "291": "Economic Development Projects and Activities",
  "292": "Budget Contingency",
  "295": "Transfers to the Sovereign Development Fund",
  "421": "Land and Buildings",
  "422": "Infrastructure Development",
  "423": "Furniture, Equipment, Software and Other Assets",
  "424": "Vehicles and Transport Assets",
  "441": "Domestic Equity Investments and Capital Contributions",
  "442": "Overseas Equity Investments",
  "451": "Building Alterations and Improvements",
  "721": "Short-Term Domestic Loan Repayments",
  "722": "Short-Term Foreign Loan Repayments",
  "723": "Long-Term Domestic Loan Repayments",
  "725": "Long-Term Foreign Loan Repayments",
  "731": "Domestic Loans Granted",
  "732": "Foreign Loans Granted",
};

function getClassification(glCode: string): string {
  return GL_CLASSIFICATIONS[glCode.substring(0, 3)] || "Other";
}

interface GlCode {
  id: number;
  gl_code: string;
  name_en: string;
  name_dv: string;
  details: string;
}

interface ClassGroup {
  code: string;
  name: string;
  items: GlCode[];
}

export default function BudgetCodesPage() {
  const [allCodes, setAllCodes] = useState<GlCode[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GlCode | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  // Load all codes at once (no pagination needed with accordion)
  useEffect(() => {
    fetch("/api/gl-codes/public?limit=1000")
      .then((res) => res.json())
      .then((d) => {
        setAllCodes(d.glCodes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter by search and group by classification
  const groups = useMemo(() => {
    const filtered = search
      ? allCodes.filter(
          (c) =>
            c.gl_code.toLowerCase().includes(search.toLowerCase()) ||
            c.name_en.toLowerCase().includes(search.toLowerCase()) ||
            c.name_dv.includes(search)
        )
      : allCodes;

    const map = new Map<string, GlCode[]>();
    for (const item of filtered) {
      const prefix = item.gl_code.substring(0, 3);
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(item);
    }

    const result: ClassGroup[] = [];
    // Keep the classification order from the reference doc
    for (const [code, name] of Object.entries(GL_CLASSIFICATIONS)) {
      const items = map.get(code);
      if (items && items.length > 0) {
        result.push({ code, name, items });
      }
      map.delete(code);
    }
    // Any remaining codes not in the classification map
    for (const [code, items] of map) {
      result.push({ code, name: "Other", items });
    }

    return result;
  }, [allCodes, search]);

  const totalFiltered = groups.reduce((sum, g) => sum + g.items.length, 0);

  // When searching, auto-expand all groups
  useEffect(() => {
    if (search) {
      setExpanded(new Set(groups.map((g) => g.code)));
    }
  }, [search, groups]);

  const toggleGroup = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(groups.map((g) => g.code)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Budget GL Codes
          </h2>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {totalFiltered} code{totalFiltered !== 1 ? "s" : ""} in{" "}
              {groups.length} classification{groups.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Collapse All
            </button>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-solid border-blue-600 border-r-transparent" />
          <p className="mt-3 text-gray-400 text-sm">Loading...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">
            {search ? "No codes match your search" : "No budget codes available"}
          </p>
        </div>
      ) : (
        /* Accordion */
        <div className="space-y-2">
          {groups.map((group) => {
            const isOpen = expanded.has(group.code);
            return (
              <div
                key={group.code}
                className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] overflow-hidden shadow-sm"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleGroup(group.code)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#262A2E] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm font-mono font-bold text-blue-700 dark:text-blue-400">
                      {group.code}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E6E7]">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#9BA1A6]">
                        {group.items.length} code{group.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-[#3A3F44]">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/60 dark:bg-[#262A2E]/60">
                          <th className="pl-5 pr-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-28">
                            Code
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            English Name
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 pr-5">
                            Dhivehi Name
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelected(item)}
                            className="group border-t border-gray-100 dark:border-[#3A3F44]/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                          >
                            <td className="pl-5 pr-2 py-2.5">
                              <span className="inline-flex items-center gap-1.5">
                                <code className="text-[13px] font-semibold text-gray-900 dark:text-white font-mono">
                                  {item.gl_code}
                                </code>
                                <button
                                  onClick={(e) => copyCode(item.gl_code, e)}
                                  className="p-0.5 rounded text-gray-300 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
                                  title="Copy code"
                                >
                                  {copied === item.gl_code ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                              {item.name_en || (
                                <span className="text-gray-300 dark:text-gray-600">
                                  —
                                </span>
                              )}
                            </td>
                            <td
                              className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 text-right pr-5"
                              dir="rtl"
                            >
                              {item.name_dv || (
                                <span className="text-gray-300 dark:text-gray-600">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <span className="text-base font-mono font-bold text-blue-700 dark:text-blue-400">
                    {selected.gl_code}
                  </span>
                  <button
                    onClick={() => copyCode(selected.gl_code)}
                    className="p-0.5 rounded text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 transition"
                    title="Copy code"
                  >
                    {copied === selected.gl_code ? (
                      <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Budget Code
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Classification
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-mono font-medium">
                    {selected.gl_code.substring(0, 3)}
                  </span>
                  {" — "}
                  {getClassification(selected.gl_code)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  English Name
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {selected.name_en || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Dhivehi Name
                </label>
                <p
                  className="text-base text-gray-900 dark:text-gray-100 text-right"
                  dir="rtl"
                >
                  {selected.name_dv || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Details
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" dir="rtl">
                  {selected.details || (
                    <span className="text-gray-400 italic" dir="ltr">
                      No details available
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
