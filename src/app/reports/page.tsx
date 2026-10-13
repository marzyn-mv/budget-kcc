"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ReportData {
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalAcr: number;
    poTotal: number;
    otherPvTotal: number;
  };
  byFund: { fund: string; budget: number }[];
  bySection: { section: string; budget: number }[];
  byCenter: { center: string; budget: number }[];
  byGl: { code: string; description: string; budget: number }[];
  spentByFund: { fund: string; poSpent: number; pvSpent: number }[];
}

const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#F43F5E", // rose-500
  "#06B6D4", // cyan-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
];

function formatMVR(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-[#E4E6E7] mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#262A2E] border border-gray-200 dark:border-[#3A3F44] rounded-lg p-3 shadow-lg text-sm">
      {label && (
        <p className="text-gray-600 dark:text-[#9BA1A6] mb-1">{label}</p>
      )}
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatMVR(entry.value)}
        </p>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="bg-white dark:bg-[#262A2E] border border-gray-200 dark:border-[#3A3F44] rounded-lg p-3 shadow-lg text-sm">
      <p className="text-gray-600 dark:text-[#9BA1A6]">{data.name}</p>
      <p className="font-medium" style={{ color: data.payload.fill }}>
        {formatMVR(data.value)}
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-3 text-gray-500 dark:text-[#9BA1A6]">
            Loading report data...
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-500">Failed to load report data.</p>
      </div>
    );
  }

  const { summary } = data;
  const spentPercent =
    summary.totalBudget > 0
      ? ((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)
      : "0";

  // Merge budget + spent by fund for grouped bar chart
  const budgetVsSpent = data.byFund.map((f) => {
    const spent = data.spentByFund.find((s) => s.fund === f.fund);
    return {
      fund: f.fund,
      budget: f.budget,
      spent: spent ? spent.poSpent + spent.pvSpent : 0,
    };
  });

  // Utilization per fund
  const utilization = budgetVsSpent.map((f) => ({
    fund: f.fund,
    percent: f.budget > 0 ? (f.spent / f.budget) * 100 : 0,
    spent: f.spent,
    budget: f.budget,
  }));

  // Spending breakdown pie
  const spendingBreakdown = [
    { name: "Purchase Orders", value: summary.poTotal },
    { name: "Other Vouchers", value: summary.otherPvTotal },
    { name: "ACR (Reserved)", value: summary.totalAcr },
  ].filter((d) => d.value > 0);

  const axisStyle = {
    fontSize: 12,
    fill: "#9BA1A6",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7] mb-2">
          Budget Reports &amp; Analytics
        </h2>
        <p className="text-gray-500 dark:text-[#9BA1A6]">
          Visual breakdown of budget allocation and spending across funds,
          sections, and centers
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">
            Total Budget
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">
            {formatMVR(summary.totalBudget)}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">
            Approved Budget
          </p>
        </div>
        <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mb-1">
            Total Spent
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">
            {formatMVR(summary.totalSpent)}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mt-1">
            {spentPercent}% of budget
          </p>
        </div>
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            summary.totalRemaining >= 0
              ? "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/50"
              : "bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/50"
          }`}
        >
          <p
            className={`text-sm mb-1 ${
              summary.totalRemaining >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            Remaining
          </p>
          <p
            className={`text-2xl font-bold ${
              summary.totalRemaining >= 0
                ? "text-green-900 dark:text-green-300"
                : "text-red-900 dark:text-red-300"
            }`}
          >
            {formatMVR(summary.totalRemaining)}
          </p>
          <p
            className={`text-xs mt-1 ${
              summary.totalRemaining >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            Budget - Spent
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/15 rounded-xl border border-orange-200 dark:border-orange-800/50 p-5 shadow-sm">
          <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">
            Reserved (ACR)
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
            {formatMVR(summary.totalAcr)}
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
            Commitment balance
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Fund - Donut */}
        <ChartCard title="Budget by Fund">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.byFund.map((f) => ({
                  name: f.fund,
                  value: f.budget,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {data.byFund.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600 dark:text-[#9BA1A6]">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spending Breakdown - Pie */}
        <ChartCard title="Spending Breakdown">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={spendingBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {spendingBreakdown.map((_, i) => (
                  <Cell
                    key={i}
                    fill={[COLORS[0], COLORS[1], COLORS[3]][i]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600 dark:text-[#9BA1A6]">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Budget vs Spent by Fund - Grouped Bar */}
        <ChartCard title="Budget vs Spent by Fund">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetVsSpent}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3A3F44"
                opacity={0.3}
              />
              <XAxis dataKey="fund" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={formatCompact} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600 dark:text-[#9BA1A6]">
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey="budget"
                name="Budget"
                fill={COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                fill={COLORS[4]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Budget by Section - Horizontal Bar */}
        <ChartCard title="Budget by Section">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.bySection} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3A3F44"
                opacity={0.3}
              />
              <XAxis type="number" tick={axisStyle} tickFormatter={formatCompact} />
              <YAxis
                type="category"
                dataKey="section"
                tick={axisStyle}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="budget"
                name="Budget"
                fill={COLORS[1]}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top 10 Centers - Bar */}
        <ChartCard title="Top 10 Budget Items by Center">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCenter}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3A3F44"
                opacity={0.3}
              />
              <XAxis
                dataKey="center"
                tick={axisStyle}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={axisStyle} tickFormatter={formatCompact} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="budget" name="Budget" fill={COLORS[2]} radius={[4, 4, 0, 0]}>
                {data.byCenter.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Budget Utilization Rate */}
        <ChartCard title="Budget Utilization Rate">
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {utilization.map((f, i) => (
              <div key={f.fund}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-[#E4E6E7]">
                    {f.fund}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-[#9BA1A6]">
                    {f.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#262A2E] rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(f.percent, 100)}%`,
                      backgroundColor:
                        f.percent > 90
                          ? "#F43F5E"
                          : f.percent > 70
                          ? "#F59E0B"
                          : COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400 dark:text-[#6B7280]">
                    Spent: {formatMVR(f.spent)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-[#6B7280]">
                    Budget: {formatMVR(f.budget)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
