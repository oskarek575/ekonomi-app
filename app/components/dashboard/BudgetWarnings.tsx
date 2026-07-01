"use client";

import { Budget, Purchase } from "../../types/database";

type Props = {
  budgets: Budget[];
  purchases: Purchase[];
};

export default function BudgetWarnings({
  budgets,
  purchases,
}: Props) {
  const warnings = budgets.map((budget) => {
    const spent = purchases
      .filter((p) => p.kategori === budget.category)
      .reduce((sum, p) => sum + p.belopp, 0);

    const percent =
      budget.monthly_budget > 0
        ? (spent / budget.monthly_budget) * 100
        : 0;

    return {
      ...budget,
      spent,
      percent,
    };
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">

      <h2 className="text-2xl font-bold mb-6">
        ⚠ Budgetvarningar
      </h2>

      <div className="space-y-6">

        {warnings.map((item) => (
          <div key={item.id}>

            <div className="flex justify-between mb-2">

              <span className="font-semibold">
                {item.category}
              </span>

              <span
                className={
                  item.percent >= 100
                    ? "text-red-400 font-bold"
                    : item.percent >= 80
                    ? "text-yellow-400 font-bold"
                    : "text-green-400 font-bold"
                }
              >
                {Math.round(item.percent)}%
              </span>

            </div>

            <div className="w-full bg-zinc-800 rounded-full h-3">

              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  item.percent >= 100
                    ? "bg-red-500"
                    : item.percent >= 80
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(item.percent, 100)}%`,
                }}
              />

            </div>

            <p className="text-zinc-400 text-sm mt-2">
              {item.spent.toLocaleString("sv-SE")} /{" "}
              {item.monthly_budget.toLocaleString("sv-SE")} kr
            </p>

          </div>
        ))}

      </div>

    </div>
  );
}