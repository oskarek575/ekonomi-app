import { Pencil, Trash2 } from "lucide-react";

type Budget = {
  id: number;
  category: string;
  monthly_budget: number;
};

type Props = {
  budgets: Budget[];
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
};

function getCategoryColor(category: string) {
  switch (category) {
    case "Mat":
      return "bg-green-500/20 text-green-400";

    case "Golf":
      return "bg-emerald-500/20 text-emerald-400";

    case "Nöje":
      return "bg-purple-500/20 text-purple-400";

    case "Drivmedel":
      return "bg-yellow-500/20 text-yellow-400";

    default:
      return "bg-zinc-700 text-zinc-300";
  }
}

export default function BudgetList({
  budgets,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className="
        bg-zinc-900
        border
        border-zinc-800
        rounded-2xl
        p-8
        shadow-lg
      "
    >
      <div className="flex justify-between items-center mb-8">

        <h2 className="text-3xl font-bold">
          💰 Budgetar
        </h2>

        <span className="text-zinc-500">
          {budgets.length} st
        </span>

      </div>

      {budgets.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          Inga budgetar hittades.
        </div>
      ) : (
        <div className="space-y-4">

          {budgets.map((budget) => (

            <div
              key={budget.id}
              className="
                flex
                justify-between
                items-center
                rounded-xl
                bg-zinc-800/40
                p-5
                transition-all
                duration-300
                hover:bg-zinc-800
                hover:-translate-y-1
                hover:shadow-xl
              "
            >

              <div>

                <h3 className="font-bold text-lg">
                  {budget.category}
                </h3>

                <div className="flex items-center gap-3 mt-2">

                  <span
                    className={`
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-semibold
                      ${getCategoryColor(budget.category)}
                    `}
                  >
                    {budget.category}
                  </span>

                </div>

              </div>

              <div className="flex items-center gap-5">

                <div className="text-right">

                  <p className="text-zinc-400 text-sm">
                    Månadsbudget
                  </p>

                  <p className="text-2xl font-bold text-green-400">
                    {budget.monthly_budget.toLocaleString("sv-SE")} kr
                  </p>

                </div>

                <button
                  onClick={() => onEdit?.(budget)}
                  className="
                    w-10
                    h-10
                    rounded-full
                    bg-blue-500/10
                    text-blue-400
                    hover:bg-blue-500
                    hover:text-white
                    transition-all
                  "
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => onDelete?.(budget)}
                  className="
                    w-10
                    h-10
                    rounded-full
                    bg-red-500/10
                    text-red-400
                    hover:bg-red-500
                    hover:text-white
                    transition-all
                  "
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}