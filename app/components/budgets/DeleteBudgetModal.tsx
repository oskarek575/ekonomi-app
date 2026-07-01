"use client";

import { Trash2, X } from "lucide-react";

type Budget = {
  id: number;
  category: string;
  monthly_budget: number;
};

type Props = {
  budget: Budget | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
};

export default function DeleteBudgetModal({
  budget,
  open,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !budget) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[480px]">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Trash2 className="text-red-500" />
            Ta bort budget
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition"
          >
            <X />
          </button>

        </div>

        <p className="text-zinc-300 mb-6">
          Är du säker på att du vill ta bort denna budget?
        </p>

        <div className="bg-zinc-800 rounded-xl p-5 mb-8">

          <h3 className="font-bold text-lg">
            {budget.category}
          </h3>

          <div className="flex justify-between mt-3">

            <span className="text-zinc-400">
              Månad
            </span>

            <span className="font-bold text-green-400">
              {budget.monthly_budget.toLocaleString("sv-SE")} kr
            </span>

          </div>

        </div>

        <div className="flex justify-end gap-4">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Avbryt
          </button>

          <button
            onClick={() => onConfirm(budget.id)}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition flex items-center gap-2"
          >
            <Trash2 size={18} />
            Ta bort
          </button>

        </div>

      </div>

    </div>
  );
}