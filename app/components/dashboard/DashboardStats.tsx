"use client";

import StatisticsCard from "./StatisticsCard";

type Props = {
  totalBudget: number;
  budgetLeft: number;
  purchases: number;
  budgets: number;
};

export default function DashboardStats({
  totalBudget,
  budgetLeft,
  purchases,
  budgets,
}: Props) {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">

      <StatisticsCard
        title="Total budget"
        value={`${totalBudget.toLocaleString("sv-SE")} kr`}
        icon="💰"
      />

      <StatisticsCard
        title="Budget kvar"
        value={`${budgetLeft.toLocaleString("sv-SE")} kr`}
        icon="🎯"
      />

      <StatisticsCard
        title="Köp"
        value={purchases}
        icon="🛒"
      />

      <StatisticsCard
        title="Budgetar"
        value={budgets}
        icon="📊"
      />

    </div>
  );
}