type Props = {
  income: number;
  savings: number;
  budgetTotal: number;
  spent: number;
};

export default function FreeMoneyCard({
  income,
  savings,
  budgetTotal,
  spent,
}: Props) {
  const freeMoney =
    income - savings - budgetTotal - spent;

  const formatCurrency = (value: number) =>
    `${value.toLocaleString("sv-SE")} kr`;

  const percentUsed =
    income > 0
      ? Math.min(((income - freeMoney) / income) * 100, 100)
      : 0;

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-3xl
        bg-gradient-to-br
        from-green-600
        via-green-700
        to-emerald-900
        p-8
        mb-8
        shadow-2xl
      "
    >

      <div
        className="
          absolute
          -right-24
          -top-24
          h-72
          w-72
          rounded-full
          bg-white/10
          blur-3xl
        "
      />

      <div className="relative">

        <div className="flex justify-between items-center">

          <div>

            <p className="text-green-100 uppercase tracking-widest text-sm">
              Disponibelt
            </p>

            <h2 className="text-6xl font-black mt-2">
              {formatCurrency(freeMoney)}
            </h2>

            <p className="text-green-100 mt-3 text-lg">
              Kvar att använda denna månad
            </p>

          </div>

          <div className="text-7xl">
            💸
          </div>

        </div>

        <div className="mt-10">

          <div className="flex justify-between text-sm mb-3 text-green-100">

            <span>Budgetförbrukning</span>

            <span>
              {Math.round(percentUsed)}%
            </span>

          </div>

          <div className="w-full h-4 rounded-full bg-white/20">

            <div
              className="h-4 rounded-full bg-white transition-all duration-700"
              style={{
                width: `${percentUsed}%`,
              }}
            />

          </div>

        </div>

        <div className="grid grid-cols-4 gap-5 mt-10">

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">

            <p className="text-green-100 text-sm">
              Inkomst
            </p>

            <h3 className="font-bold text-xl mt-2">
              {formatCurrency(income)}
            </h3>

          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">

            <p className="text-green-100 text-sm">
              Sparande
            </p>

            <h3 className="font-bold text-xl mt-2">
              {formatCurrency(savings)}
            </h3>

          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">

            <p className="text-green-100 text-sm">
              Budgetar
            </p>

            <h3 className="font-bold text-xl mt-2">
              {formatCurrency(budgetTotal)}
            </h3>

          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">

            <p className="text-green-100 text-sm">
              Spenderat
            </p>

            <h3 className="font-bold text-xl mt-2">
              {formatCurrency(spent)}
            </h3>

          </div>

        </div>

      </div>

    </div>
  );
}