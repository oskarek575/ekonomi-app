type Budget = {
  id: number;
  category: string;
  monthly_budget: number;
};

type Purchase = {
  kategori: string;
  belopp: number;
};

type Props = {
  budgets: Budget[];
  purchases: Purchase[];
};

export default function BudgetProgress({
  budgets,
  purchases,
}: Props) {
  const formatCurrency = (value: number) =>
    value.toLocaleString("sv-SE") + " kr";

  return (
    <div className="space-y-6 mt-10">

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">
          📈 Budgetöversikt
        </h2>

        <span className="text-zinc-500">
          {budgets.length} kategorier
        </span>
      </div>

      {budgets.map((budget) => {
        const spent = purchases
          .filter((p) => p.kategori === budget.category)
          .reduce((sum, p) => sum + p.belopp, 0);

        const percent = Math.min(
          (spent / budget.monthly_budget) * 100,
          100
        );

        let barColor = "bg-green-500";
        let textColor = "text-green-400";

        if (percent >= 80) {
          barColor = "bg-yellow-400";
          textColor = "text-yellow-400";
        }

        if (percent >= 100) {
          barColor = "bg-red-500";
          textColor = "text-red-400";
        }

        return (
          <div
            key={budget.id}
            className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-6
              shadow-lg
              transition-all
              duration-300
              hover:-translate-y-1
              hover:border-green-500/40
              hover:shadow-green-500/10
            "
          >
            <div className="flex justify-between items-center mb-4">

              <div>
                <h3 className="font-bold text-xl">
                  {budget.category}
                </h3>

                <p className="text-zinc-500 text-sm">
                  {Math.round(percent)}% av budgeten använd
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  {formatCurrency(spent)}
                </p>

                <p className="text-zinc-500 text-sm">
                  av {formatCurrency(budget.monthly_budget)}
                </p>
              </div>

            </div>

            <div className="w-full h-5 bg-zinc-800 rounded-full overflow-hidden">

              <div
                className={`${barColor} h-full rounded-full transition-all duration-700`}
                style={{
                  width: `${percent}%`,
                }}
              />

            </div>

            <div className="flex justify-between mt-3">

              <span className="text-zinc-500 text-sm">
                Kvar:
              </span>

              <span className={`font-semibold ${textColor}`}>
                {formatCurrency(
                  Math.max(
                    budget.monthly_budget - spent,
                    0
                  )
                )}
              </span>

            </div>

          </div>
        );
      })}
    </div>
  );
}