"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type Purchase = {
  kategori: string;
  belopp: number;
};

type Budget = {
  category: string;
  monthly_budget: number;
};

type Props = {
  purchases: Purchase[];
  budgets: Budget[];
};

export default function SpendingChart({
  purchases,
  budgets,
}: Props) {
  const data = budgets.map((budget) => {
    const spent = purchases
      .filter((purchase) => purchase.kategori === budget.category)
      .reduce((sum, purchase) => sum + purchase.belopp, 0);

    return {
      kategori: budget.category,
      budget: budget.monthly_budget,
      spenderat: spent,
    };
  });

  return (
    <div
      className="
        bg-zinc-900
        border
        border-zinc-800
        rounded-2xl
        p-8
        mt-10
        shadow-lg
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-green-500/40
        hover:shadow-green-500/10
      "
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">
          📊 Budget vs Spenderat
        </h2>

        <span className="text-zinc-500">
          {data.length} kategorier
        </span>
      </div>

      <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            barGap={8}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#3f3f46"
            />

            <XAxis
              dataKey="kategori"
              tick={{ fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(value) =>
                `${Number(value ?? 0).toLocaleString("sv-SE")} kr`
              }
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "12px",
                color: "white",
              }}
            />

            <Legend />

            <Bar
              dataKey="budget"
              name="Budget"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              animationDuration={900}
            />

            <Bar
              dataKey="spenderat"
              name="Spenderat"
              fill="#22c55e"
              radius={[8, 8, 0, 0]}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
