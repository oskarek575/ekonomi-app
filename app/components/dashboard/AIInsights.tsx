"use client";

import { Budget, Purchase } from "../../types/database";

type Props = {
  budgets: Budget[];
  purchases: Purchase[];
  income: number;
  savings: number;
};

export default function AIInsights({
  budgets,
  purchases,
  income,
  savings,
}: Props) {

  const totalBudget = budgets.reduce(
    (sum, budget) => sum + budget.monthly_budget,
    0
  );

  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + purchase.belopp,
    0
  );

  const freeMoney =
    income - savings - totalBudget - totalSpent;

  const insights: {
    emoji: string;
    title: string;
    message: string;
    color: string;
  }[] = [];

  // 💰 Fria pengar

  if (freeMoney > 5000) {
    insights.push({
      emoji: "💰",
      title: "Bra jobbat",
      message: `Du har fortfarande ${freeMoney.toLocaleString("sv-SE")} kr kvar denna månad.`,
      color: "border-green-500",
    });
  } else if (freeMoney > 0) {
    insights.push({
      emoji: "🙂",
      title: "Du håller budgeten",
      message: `Du har ${freeMoney.toLocaleString("sv-SE")} kr kvar.`,
      color: "border-yellow-500",
    });
  } else {
    insights.push({
      emoji: "🚨",
      title: "Budgeten är överskriden",
      message: `Du ligger ${Math.abs(freeMoney).toLocaleString("sv-SE")} kr över din plan.`,
      color: "border-red-500",
    });
  }

  // 📊 Budgetvarning

  budgets.forEach((budget) => {

    const spent = purchases
      .filter((p) => p.kategori === budget.category)
      .reduce((sum, p) => sum + p.belopp, 0);

    const percent =
      (spent / budget.monthly_budget) * 100;

    if (percent >= 90) {
      insights.push({
        emoji: "⚠️",
        title: `${budget.category}`,
        message: `${Math.round(percent)} % av budgeten är redan använd.`,
        color: "border-orange-500",
      });
    }

  });

  // 🛒 Många köp

  if (purchases.length >= 30) {
    insights.push({
      emoji: "🛒",
      title: "Många köp",
      message: `Du har gjort ${purchases.length} köp denna månad.`,
      color: "border-blue-500",
    });
  }

  // 🏆 Största kategori

  const totals: Record<string, number> = {};

  purchases.forEach((purchase) => {
    totals[purchase.kategori] =
      (totals[purchase.kategori] || 0) + purchase.belopp;
  });

  const biggest = Object.entries(totals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (biggest) {
    insights.push({
      emoji: "🏆",
      title: "Största utgift",
      message: `${biggest[0]} står för ${biggest[1].toLocaleString("sv-SE")} kr.`,
      color: "border-purple-500",
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">

      <h2 className="text-2xl font-bold mb-6">
        🧠 AI Insights
      </h2>

      <div className="space-y-4">

        {insights.map((insight, index) => (

          <div
            key={index}
            className={`bg-zinc-800 rounded-xl border-l-4 ${insight.color} p-5`}
          >

            <h3 className="font-bold text-lg mb-1">
              {insight.emoji} {insight.title}
            </h3>

            <p className="text-zinc-300">
              {insight.message}
            </p>

          </div>

        ))}

      </div>

    </div>
  );
}