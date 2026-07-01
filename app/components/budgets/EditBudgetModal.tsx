"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { Category } from "../../types/database";

type Budget = {
  id: number;
  category: string;
  monthly_budget: number;
};

type Props = {
  budget: Budget | null;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onSave: (
    id: number,
    category: string,
    monthly_budget: number
  ) => Promise<void>;
};

export default function EditBudgetModal({
  budget,
  categories,
  open,
  onClose,
  onSave,
}: Props) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (budget) {
      setCategory(budget.category);
      setAmount(budget.monthly_budget.toString());
    }
  }, [budget]);

  if (!open || !budget) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[500px]">

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-2xl font-bold">
            ✏️ Redigera budget
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition"
          >
            <X />
          </button>

        </div>

        <div className="space-y-5">

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
          >
            {categories.map((cat) => (
              <option
                key={cat.id}
                value={cat.name}
              >
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
            placeholder="Budget"
          />

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Avbryt
          </button>

          <button
            onClick={() =>
              onSave(
                budget.id,
                category,
                Number(amount)
              )
            }
            className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 transition flex items-center gap-2"
          >
            <Save size={18} />
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}