"use client";

import { Budget, Purchase } from "../../../types/database";

import BudgetProgress from "../cards/BudgetProgress";
import BudgetWarnings from "../cards/BudgetWarnings";
import BiggestPurchase from "../cards/BiggestPurchase";
import QuickActions from "../actions/QuickActions";
import UpcomingSubscriptions from "../lists/UpcomingSubscriptions";
import RecentPurchases from "../lists/RecentPurchases";

type Props = {
  budgets: Budget[];
  purchases: Purchase[];
  onDeletePurchase: (id: number) => void;
};

export default function DashboardBottom({
  budgets,
  purchases,
  onDeletePurchase,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-12 gap-6 mb-8">

        <div className="col-span-7">
          <BudgetProgress
            budgets={budgets}
            purchases={purchases}
          />
        </div>

        <div className="col-span-5">
          <BiggestPurchase
            purchases={purchases}
          />
        </div>

      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">

        <div className="col-span-7">
          <BudgetWarnings
            budgets={budgets}
            purchases={purchases}
          />
        </div>

        <div className="col-span-5 space-y-6">

          <UpcomingSubscriptions />

          <QuickActions />

        </div>

      </div>

      <RecentPurchases
        kop={purchases}
        onDelete={onDeletePurchase}
      />
    </>
  );
}
