"use client";

import { Budget, Purchase } from "../../../types/database";

import SpendingChart from "../cards/SpendingChart";
import TopCategories from "../cards/TopCategories";

type Props = {
  purchases: Purchase[];
  budgets: Budget[];
};

export default function DashboardCharts({
  purchases,
  budgets,
}: Props) {
  return (
    <div className="grid grid-cols-12 gap-6 mb-8">

      <div className="col-span-8">

        <SpendingChart
          purchases={purchases}
          budgets={budgets}
        />

      </div>

      <div className="col-span-4">

        <TopCategories
          purchases={purchases}
        />

      </div>

    </div>
  );
}
