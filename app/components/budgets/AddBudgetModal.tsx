"use client";

import { useEffect, useState } from "react";
import { Category } from "../../types/database";

type Props = {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onSave: (
    category: string,
    monthly_budget: number
  ) => void;
};

export default function AddBudgetModal({
  open,
  categories,
  onClose,
  onSave,
}: Props) {
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (open) {
      setCategory(
        categories.length > 0
          ? categories[0].name
          : ""
      );
      setBudget("");
    }
  }, [open, categories]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[500px] p-8">

        <h2 className="text-3xl font-bold mb-6">
          ➕ Ny budget
        </h2>

        <div className="space-y-5">

          <div>

            <label className="block mb-2 text-zinc-400">
              Kategori
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="
                w-full
                bg-zinc-800
                rounded-xl
                p-4
                border
                border-zinc-700
              "
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

          </div>

          <div>

            <label className="block mb-2 text-zinc-400">
              Budget
            </label>

            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="
                w-full
                bg-zinc-800
                rounded-xl
                p-4
                border
                border-zinc-700
              "
            />

          </div>

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="
              px-5
              py-3
              rounded-xl
              bg-zinc-700
              hover:bg-zinc-600
            "
          >
            Avbryt
          </button>

          <button
            onClick={() =>
              onSave(
                category,
                Number(budget)
              )
            }
            className="
              px-5
              py-3
              rounded-xl
              bg-green-600
              hover:bg-green-500
            "
          >
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}